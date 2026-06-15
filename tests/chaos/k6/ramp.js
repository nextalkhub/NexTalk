/**
 * Ramp test - плавный рост нагрузки для демонстрации HPA-автоскейла.
 *
 * В отличие от spike.js (резкий пик для проверки выживания) здесь нагрузка
 * растёт ступенями и ДЕРЖИТСЯ на каждой, чтобы HPA успел среагировать:
 *   - scaleUp stabilizationWindow = 120s -> каждый плато ≥ 2 мин
 *   - scaleDown stabilizationWindow = 300s -> финальное затишье ≥ 5 мин
 *
 * Что смотреть в Grafana (row "Kubernetes / Scaling") во время прогона:
 *   1. RPS растёт по ступеням
 *   2. HPA desired ползёт вверх 2 -> ... -> max
 *   3. Replicas Ready догоняют desired
 *   4. p95 latency держится в SLO несмотря на рост нагрузки
 *   5. после спада нагрузки реплики плавно возвращаются к 2 (через ~5 мин)
 *
 * Запуск:
 *   k6 run ramp.js \
 *     --out experimental-prometheus-rw \
 *     -e API_BASE=https://nextalk.fun \
 *     -e TOKEN=<jwt>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('ramp_errors');

export const options = {
    stages: [
        { duration: '1m', target: 20  },  // прогрев, HPA на min=2
        { duration: '2m', target: 20  },  // плато: baseline
        { duration: '1m', target: 60  },  // подъём
        { duration: '3m', target: 60  },  // плато: ждём scale-up (>120s окна)
        { duration: '1m', target: 120 },  // подъём к пику
        { duration: '3m', target: 120 },  // плато: HPA добирает реплики к max
        { duration: '1m', target: 0   },  // спад нагрузки
        { duration: '5m', target: 0   },  // затишье: наблюдаем scale-down (>300s окна)
    ],
    thresholds: {
        // SLO демонстрации: latency держится в рамках, пока HPA добавляет реплики.
        http_req_failed:   ['rate<0.02'],   // < 2% ошибок на всём прогоне
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        ramp_errors:       ['rate<0.02'],
    },
};

const BASE  = __ENV.API_BASE || 'https://nextalk.fun';
const TOKEN = __ENV.TOKEN    || '';

export default function () {
    const res = http.get(
        `${BASE}/api/guilds`,
        {
            headers: { 'Authorization': `Bearer ${TOKEN}` },
            timeout: '5s',
            tags: { test: 'ramp' },
        }
    );

    const ok = res.status < 500;
    errorRate.add(!ok);

    check(res, {
        'не 5xx': (r) => r.status < 500,
    });

    sleep(0.1);
}
