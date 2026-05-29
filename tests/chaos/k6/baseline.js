/**
 * Baseline load test — 20 VU, 5 минут, steady state.
 * Цель: установить нормальный уровень метрик до chaos-сценариев.
 *
 * Запуск:
 *   k6 run baseline.js \
 *     --out experimental-prometheus-rw \
 *     -e API_BASE=https://api.nextalk.fun \
 *     -e TOKEN=<jwt>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('chaos_errors');
const latency   = new Trend('chaos_latency_ms', true);

export const options = {
    vus:      __ENV.VUS      ? parseInt(__ENV.VUS)      : 20,
    duration: __ENV.DURATION ? __ENV.DURATION            : '5m',
    thresholds: {
        http_req_failed:   ['rate<0.01'],   // <1% ошибок
        http_req_duration: ['p(95)<500'],   // 95% < 500ms
        chaos_errors:      ['rate<0.01'],
    },
};

const BASE  = __ENV.API_BASE || 'https://api.nextalk.fun';
const TOKEN = __ENV.TOKEN    || '';

const HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
};

// Разные запросы, имитирующие реальный трафик.
const SCENARIOS = [
    () => http.get(`${BASE}/healthz`),

    () => http.post(
        `${BASE}/internal/messages`,
        JSON.stringify({ channelId: '00000000-0000-0000-0000-000000000001', content: 'k6 baseline msg', authorId: 'k6-user' }),
        { headers: { ...HEADERS, 'X-Idempotency-Key': `k6-${Date.now()}-${Math.random()}` } }
    ),

    () => http.get(`${BASE}/guilds`, { headers: HEADERS }),
];

export default function () {
    const fn  = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    const res = fn();

    const ok = res.status >= 200 && res.status < 500;
    errorRate.add(!ok);
    latency.add(res.timings.duration);

    check(res, {
        'не 5xx': (r) => r.status < 500,
    });

    sleep(Math.random() * 0.5 + 0.1); // 100–600ms пауза
}
