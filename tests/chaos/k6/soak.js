/**
 * Soak / NFR-нагрузка: ровный HTTP RPS + пул живых WebSocket-соединений.
 * Держится, пока не выйдет DURATION или пока не нажмёшь Ctrl+C - чтобы можно было
 * зайти в систему руками и посмотреть, как она ведёт себя под нагрузкой.
 *
 * Параметры (-e):
 *   API_BASE     URL (по умолчанию https://nextalk.fun)
 *   TOKEN        JWT (для WS и аутентифицированного HTTP)
 *   RPS          целевой HTTP RPS (по умолчанию 100; 0 - выключить HTTP)
 *   WS_CONNS     число WS-соединений (по умолчанию 400; 0 - выключить WS)
 *   DURATION     сколько держать = авто-таймаут (по умолчанию 15m)
 *   TARGET_PATH  HTTP-эндпоинт (по умолчанию /api/guilds)
 *   MAX_VUS      потолок VU для HTTP (по умолчанию max(100, RPS*0.6))
 *
 * Примеры:
 *   k6 run soak.js -e TOKEN=<jwt> -e RPS=100 -e WS_CONNS=400 -e DURATION=15m --out experimental-prometheus-rw
 *   k6 run soak.js -e TOKEN=<jwt> -e RPS=1000 -e WS_CONNS=0 -e DURATION=10m   # только HTTP
 *   k6 run soak.js -e TOKEN=<jwt> -e RPS=0 -e WS_CONNS=500 -e DURATION=20m    # только WS
 */
import http from 'k6/http';
import ws from 'k6/ws';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE     = __ENV.API_BASE    || 'https://nextalk.fun';
const TOKEN    = __ENV.TOKEN       || '';
const RPS      = __ENV.RPS         ? parseInt(__ENV.RPS)      : 100;
const CONNS    = __ENV.WS_CONNS    ? parseInt(__ENV.WS_CONNS) : 400;
const DURATION = __ENV.DURATION    || '15m';
const PATH     = __ENV.TARGET_PATH || '/api/guilds';
const MAX_VUS  = __ENV.MAX_VUS     ? parseInt(__ENV.MAX_VUS)  : Math.max(100, Math.ceil(RPS * 0.6));
const RESOLVE  = __ENV.RESOLVE     || '';   // IP, на который резолвить домен (тест изнутри, минуя публичный edge)
const WS_BASE  = BASE.replace(/^http/, 'ws');
const HOST     = BASE.replace(/^https?:\/\//, '').replace(/[:\/].*$/, '');
const RS = String.fromCharCode(0x1e);  // SignalR record separator

// 4xx (например 401 при истёкшем токене) НЕ считаем падением - падение это только 5xx.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

const wsErrors     = new Counter('soak_ws_errors');
const wsHandshakes = new Counter('soak_ws_handshakes');

// Сценарии собираются динамически: RPS=0 или WS_CONNS=0 выключают свою часть.
const scenarios = {};
if (RPS > 0) {
  scenarios.http_load = {
    executor: 'constant-arrival-rate',
    rate: RPS,
    timeUnit: '1s',
    duration: DURATION,
    preAllocatedVUs: Math.max(20, Math.ceil(MAX_VUS / 2)),
    maxVUs: MAX_VUS,
    exec: 'httpLoad',
  };
}
if (CONNS > 0) {
  scenarios.ws_hold = {
    executor: 'constant-vus',
    vus: CONNS,
    duration: DURATION,
    exec: 'wsSession',
  };
}

export const options = {
  scenarios,
  // RESOLVE=<ip> резолвит домен на приватный IP ноды: тест идёт изнутри, мимо
  // публичного DNS/edge (и DDoS-защиты). TLS-сертификат и Host остаются прежними.
  hosts: RESOLVE ? { [HOST]: RESOLVE } : undefined,
  thresholds: {
    http_req_failed:   ['rate<0.05'],    // <5% 5xx (4xx не в счёт)
    http_req_duration: ['p(95)<2000'],   // информативно, не аборт
  },
};

// ── HTTP: ровный RPS ─────────────────────────────────────────────────────────
export function httpLoad() {
  const params = { timeout: '10s' };
  if (TOKEN) params.headers = { Authorization: `Bearer ${TOKEN}` };
  const res = http.get(`${BASE}${PATH}`, params);
  check(res, { 'не 5xx': (r) => r.status < 500 });
}

// ── WS: открыть SignalR-соединение и держать его всё время теста ──────────────
export function wsSession() {
  const neg = http.post(`${BASE}/hubs/chat/negotiate?negotiateVersion=1`, null, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    timeout: '10s',
  });
  if (neg.status !== 200) { wsErrors.add(1); return; }
  const ct = neg.json('connectionToken');
  const url = `${WS_BASE}/hubs/chat?id=${ct}&access_token=${TOKEN}`;

  ws.connect(url, {}, function (socket) {
    let hs = false;
    socket.on('open', () => socket.send(`{"protocol":"json","version":1}${RS}`));
    socket.on('message', () => { if (!hs) { hs = true; wsHandshakes.add(1); } });
    socket.on('error', () => wsErrors.add(1));
    // Heartbeat каждые 15с: держит presence online и не даёт коннекту протухнуть.
    socket.setInterval(() => socket.send(`{"type":1,"target":"Heartbeat","arguments":[]}${RS}`), 15000);
    // Держим соединение; реально закроется по DURATION сценария или по Ctrl+C.
    socket.setTimeout(() => socket.close(), 1000 * 60 * 120);
  });
}
