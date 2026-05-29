/**
 * Companion load — фоновая нагрузка во время chaos-сценариев (10 VU, бесконечно).
 * Запускается run-all.sh параллельно с bash-сценариями.
 * Завершается сигналом SIGINT от оркестратора.
 *
 * Запуск:
 *   k6 run companion.js \
 *     --out experimental-prometheus-rw \
 *     -e API_BASE=https://api.nextalk.fun \
 *     -e TOKEN=<jwt>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate    = new Rate('companion_errors');
const requestCount = new Counter('companion_requests');

export const options = {
    vus:      __ENV.VUS ? parseInt(__ENV.VUS) : 10,
    duration: __ENV.DURATION || '60m',  // оркестратор прерывает раньше
    thresholds: {
        companion_errors: ['rate<0.30'],  // во время chaos допускаем до 30% ошибок
    },
    noConnectionReuse: false,
};

const BASE  = __ENV.API_BASE || 'https://api.nextalk.fun';
const TOKEN = __ENV.TOKEN    || '';

const HEADERS = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${TOKEN}`,
};

export default function () {
    // Чередуем разные endpoint'ы равномерно.
    const roll = __ITER % 3;

    let res;
    if (roll === 0) {
        res = http.get(`${BASE}/healthz`, { timeout: '3s' });
    } else if (roll === 1) {
        res = http.get(`${BASE}/guilds`, { headers: HEADERS, timeout: '3s' });
    } else {
        res = http.post(
            `${BASE}/internal/messages`,
            JSON.stringify({
                channelId: '00000000-0000-0000-0000-000000000001',
                content:   `companion-${__VU}-${__ITER}`,
                authorId:  `companion-${__VU}`,
            }),
            {
                headers: { ...HEADERS, 'X-Idempotency-Key': `cp-${__VU}-${__ITER}` },
                timeout: '3s',
            }
        );
    }

    requestCount.add(1);
    errorRate.add(res.status >= 500 || res.status === 0);

    check(res, { 'получили ответ': (r) => r.status !== 0 });

    sleep(0.2 + Math.random() * 0.3);
}
