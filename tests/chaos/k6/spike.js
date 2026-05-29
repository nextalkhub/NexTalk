/**
 * Spike test — резкий рост нагрузки: 0 → 100 VU → 0.
 * Цель: проверить, что система не падает под пиком и восстанавливается.
 *
 * Запуск:
 *   k6 run spike.js \
 *     --out experimental-prometheus-rw \
 *     -e API_BASE=https://api.nextalk.fun \
 *     -e TOKEN=<jwt>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('spike_errors');

export const options = {
    stages: [
        { duration: '30s', target: 0   },  // старт — тишина
        { duration: '30s', target: 100 },  // резкий рост
        { duration: '1m',  target: 100 },  // держим пик
        { duration: '30s', target: 0   },  // спад
        { duration: '30s', target: 0   },  // наблюдаем восстановление
    ],
    thresholds: {
        http_req_failed:   ['rate<0.05'],   // допускаем до 5% ошибок под пиком
        http_req_duration: ['p(99)<2000'],  // 99% < 2s
        spike_errors:      ['rate<0.05'],
    },
};

const BASE  = __ENV.API_BASE || 'https://api.nextalk.fun';
const TOKEN = __ENV.TOKEN    || '';

export default function () {
    const res = http.post(
        `${BASE}/internal/messages`,
        JSON.stringify({
            channelId: '00000000-0000-0000-0000-000000000001',
            content:   `spike-${__VU}-${__ITER}`,
            authorId:  `k6-spike-${__VU}`,
        }),
        {
            headers: {
                'Content-Type':      'application/json',
                'Authorization':     `Bearer ${TOKEN}`,
                'X-Idempotency-Key': `spike-${__VU}-${__ITER}-${Date.now()}`,
            },
            timeout: '5s',
        }
    );

    const ok = res.status < 500;
    errorRate.add(!ok);

    check(res, {
        'не 5xx': (r) => r.status < 500,
    });

    sleep(0.05);
}
