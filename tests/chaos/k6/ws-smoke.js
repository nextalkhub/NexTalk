/**
 * WebSocket smoke - проверка real-time пути (SignalR) во время chaos.
 *
 * Закрывает главный пробел: остальные тесты дёргают HTTP /api/guilds, а ядро
 * чата - WebSocket. Этот скрипт ОТКРЫВАЕТ настоящее SignalR-соединение,
 * проходит handshake и вызывает hub-метод GetOnlineUsers (read-only) - то есть
 * проверяет, что WS-путь жив и round-trip работает.
 *
 * Запускать как witness ПАРАЛЛЕЛЬНО со сценарием, который бьёт по WS:
 *   # панель 1 - WS-нагрузка-свидетель
 *   k6 run ws-smoke.js -e API_BASE=https://nextalk.fun -e TOKEN=<jwt> --out experimental-prometheus-rw
 *   # панель 2 - убиваем ws-gateway / делаем rolling update
 *   SKIP_BASELINE=1 ONLY_SCENARIO=SC-04 bash run-all.sh
 *
 * Если во время SC-04/SC-07 handshake/invoke rate остаются высокими -
 * значит клиенты переподключаются и сообщения продолжают ходить.
 *
 * Метрики:
 *   ws_connect_fail  - доля неудачных negotiate/upgrade
 *   ws_handshake_ok  - доля успешных SignalR-handshake
 *   ws_invoke_ok     - доля успешных round-trip вызовов GetOnlineUsers
 */
import ws from 'k6/ws';
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const RS = String.fromCharCode(0x1e);  // SignalR record separator

const connectFail = new Rate('ws_connect_fail');
const handshakeOk = new Rate('ws_handshake_ok');
const invokeOk    = new Rate('ws_invoke_ok');
const wsErrors    = new Counter('ws_errors');

export const options = {
    vus:      __ENV.VUS ? parseInt(__ENV.VUS) : 10,
    duration: __ENV.DURATION || '2m',
    thresholds: {
        ws_connect_fail: ['rate<0.05'],   // < 5% неудачных подключений
        ws_handshake_ok: ['rate>0.95'],   // > 95% успешных handshake
        ws_invoke_ok:    ['rate>0.90'],   // > 90% успешных round-trip
    },
};

const BASE    = __ENV.API_BASE || 'https://nextalk.fun';
const TOKEN   = __ENV.TOKEN    || '';
const WS_BASE = BASE.replace(/^http/, 'ws');
const HOLD_MS = __ENV.HOLD_MS ? parseInt(__ENV.HOLD_MS) : 10000;

export default function () {
    // 1. SignalR negotiate (HTTP, токен в заголовке).
    const neg = http.post(`${BASE}/hubs/chat/negotiate?negotiateVersion=1`, null, {
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        timeout: '5s',
    });
    if (neg.status !== 200) {
        connectFail.add(true);
        handshakeOk.add(false);
        invokeOk.add(false);
        return;
    }
    connectFail.add(false);
    const connectionToken = neg.json('connectionToken');

    // 2. WS-апгрейд (токен в query - браузер не может слать заголовки на WS).
    const url = `${WS_BASE}/hubs/chat?id=${connectionToken}&access_token=${TOKEN}`;

    let handshakeDone = false;
    let invokeDone = false;

    const res = ws.connect(url, {}, function (socket) {
        socket.on('open', () => {
            // 3. SignalR handshake.
            socket.send(`{"protocol":"json","version":1}${RS}`);
        });

        socket.on('message', (data) => {
            // Сообщения разделены 0x1e, в одном кадре их может быть несколько.
            const frames = String(data).split(RS).filter((f) => f.length > 0);
            for (const f of frames) {
                let msg;
                try { msg = JSON.parse(f); } catch (e) { continue; }

                if (!handshakeDone) {
                    // Первый ответ - результат handshake: {} = ok, {error} = провал.
                    handshakeDone = true;
                    if (msg.error) {
                        handshakeOk.add(false);
                        socket.close();
                        return;
                    }
                    handshakeOk.add(true);
                    // 4. Round-trip: вызываем read-only метод хаба.
                    socket.send(`{"type":1,"invocationId":"1","target":"GetOnlineUsers","arguments":[]}${RS}`);
                    continue;
                }

                // type 3 = completion нашего вызова.
                if (msg.type === 3 && msg.invocationId === '1') {
                    invokeDone = true;
                    invokeOk.add(!msg.error);
                }
            }
        });

        socket.on('error', () => { wsErrors.add(1); });

        socket.on('close', () => {
            // Если что-то не доехало до закрытия - засчитываем как неуспех.
            if (!handshakeDone) handshakeOk.add(false);
            if (!invokeDone)    invokeOk.add(false);
        });

        socket.setTimeout(() => socket.close(), HOLD_MS);
    });

    check(res, { 'ws upgrade 101': (r) => r && r.status === 101 });
}
