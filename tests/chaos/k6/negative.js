/**
 * Negative tests - 20 VU, 3 минуты.
 * Цель: убедиться что API корректно отвергает невалидные запросы.
 *
 * Запуск:
 *   k6 run negative.js \
 *     --out experimental-prometheus-rw \
 *     -e API_BASE=https://nextalk.fun \
 *     -e TOKEN=<jwt>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const wrongCodeRate = new Rate('negative_wrong_code');

export const options = {
    vus:      20,
    duration: '3m',
    thresholds: {
        // ни один негативный кейс не должен вернуть 200 или 5xx
        negative_wrong_code: ['rate<0.01'],
        http_req_failed:     ['rate<0.01'],
    },
};

const BASE  = __ENV.API_BASE || 'https://nextalk.fun';
const TOKEN = __ENV.TOKEN    || '';

// Генерирует payload заданного размера в байтах.
function bigPayload(bytes) {
    return 'x'.repeat(bytes);
}

const CASES = [
    // 1. Нет Authorization → 401
    function noAuth() {
        const res = http.post(`${BASE}/api/guilds`, '{}', {
            headers: { 'Content-Type': 'application/json' },
        });
        const ok = check(res, {
            'no-auth → 401': (r) => r.status === 401,
        });
        wrongCodeRate.add(!ok);
    },

    // 2. Невалидный Bearer token → 401
    function invalidToken() {
        const res = http.get(`${BASE}/api/guilds`, {
            headers: { 'Authorization': 'Bearer invalid.token.here' },
        });
        const ok = check(res, {
            'invalid-token → 401': (r) => r.status === 401,
        });
        wrongCodeRate.add(!ok);
    },

    // 3. Malformed Authorization header (не "Bearer xxx") → 401
    function malformedAuth() {
        const res = http.get(`${BASE}/api/guilds`, {
            headers: { 'Authorization': 'Basic dXNlcjpwYXNz' },
        });
        const ok = check(res, {
            'malformed-auth → 401': (r) => r.status === 401,
        });
        wrongCodeRate.add(!ok);
    },

    // 4. GET несуществующего ресурса с валидным TOKEN → 404
    function notFound() {
        const res = http.get(`${BASE}/api/guilds/00000000-0000-0000-0000-000000000000`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` },
        });
        const ok = check(res, {
            'not-found → 401 or 404': (r) => r.status === 404 || r.status === 401,
        });
        wrongCodeRate.add(!ok);
    },

    // 5. POST с невалидным JSON body → 400 или 422
    function invalidJson() {
        const res = http.post(`${BASE}/api/guilds`, 'not-json-at-all{{{{', {
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${TOKEN}`,
            },
        });
        const ok = check(res, {
            'invalid-json → 400/401/422': (r) => r.status === 400 || r.status === 401 || r.status === 422,
        });
        wrongCodeRate.add(!ok);
    },

    // 6. Очень большой payload (>100KB) → 413 или rejection (connection close = статус 0)
    function largePayload() {
        const res = http.post(`${BASE}/api/guilds`, bigPayload(120 * 1024), {
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${TOKEN}`,
            },
            timeout: '10s',
        });
        // 413 - сервер отверг, 401 - auth раньше body, 0 - connection сброшен nginx
        const ok = check(res, {
            'large-payload → 413/401/0': (r) => r.status === 413 || r.status === 401 || r.status === 0,
        });
        wrongCodeRate.add(!ok);
    },

    // 7. Неправильный HTTP метод (DELETE /api/guilds без id) → 405
    function wrongMethod() {
        const res = http.del(`${BASE}/api/guilds`, null, {
            headers: { 'Authorization': `Bearer ${TOKEN}` },
        });
        const ok = check(res, {
            'wrong-method → 401/404/405': (r) => r.status === 401 || r.status === 404 || r.status === 405,
        });
        wrongCodeRate.add(!ok);
    },
];

export default function () {
    const fn = CASES[Math.floor(Math.random() * CASES.length)];
    fn();

    sleep(Math.random() * 0.4 + 0.1); // 100–500ms пауза
}
