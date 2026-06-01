# Сбор логов: Alloy → Loki

Документ описывает итоговую архитектуру сбора логов, все проблемы с которыми столкнулись при настройке, и почему конфиг выглядит именно так.

Связанные файлы: [charts/nextalk/templates/alloy.yaml](../charts/nextalk/templates/alloy.yaml), [charts/nextalk/files/alloy-k8s.alloy](../charts/nextalk/files/alloy-k8s.alloy), [architecture-analysis.md](architecture-analysis.md), [tests/chaos/CHAOS_TESTING.md](../tests/chaos/CHAOS_TESTING.md).

---

## Итоговая архитектура

```
k3s нода (каждая)
  └── Alloy DaemonSet (hostNetwork: true, runAsUser: 0)
        ├── читает /var/log/pods/nextalk_*/*/*.log  (hostPath mount)
        ├── извлекает namespace/pod/container из пути файла
        ├── снимает CRI-префикс (stage.cri)
        ├── парсит Serilog CompactJSON (stage.json)
        └── пушит в Loki 10.19.0.41:3100 (host network namespace)
```

Loki запущен на obs-vps (10.19.0.41) через Docker Compose, Ansible. Хранение: filesystem, 30 дней.

---

## .NET сервисы: формат логов

Все четыре сервиса (guild, messaging, voice, websocket-gateway) пишут в stdout через Serilog:

```json
{"@t":"2026-05-29T10:00:00.0000000Z","@m":"User joined guild","@l":"Information","TraceId":"abc123","SpanId":"def456"}
```

Конфиг в `appsettings.json`:
```json
"WriteTo": [{
  "Name": "Console",
  "Args": { "formatter": "Serilog.Formatting.Compact.CompactJsonFormatter, Serilog.Formatting.Compact" }
}]
```

`Enrich.WithSpan()` добавляет `TraceId` и `SpanId` - Alloy кладет их в Loki structured metadata, Grafana использует для cross-link Logs ↔ Traces.

---

## Конфиг Alloy: как работает

**`alloy-k8s.alloy`** - без `discovery.kubernetes` (причина ниже):

### 1. Поиск файлов (`local.file_match`)

```alloy
local.file_match "pods" {
  path_targets = [{ __path__ = "/var/log/pods/nextalk_*/*/*.log", job = "nextalk" }]
  sync_period  = "10s"
}
```

Glob `nextalk_*/*/*.log` покрывает только namespace nextalk. Новые поды подхватываются через `sync_period`.

### 2. Извлечение меток из пути (`discovery.relabel`)

Путь containerd: `/var/log/pods/<ns>_<pod>_<uid>/<container>/<n>.log`

Пример: `/var/log/pods/nextalk_guild-service-78d7cb8f45-4gp2b_a1b2c3-...-ef12/guild-service/0.log`

Регекс `/var/log/pods/([^_/]+)_([^_/]+)_[^/]+/([^/]+)/[0-9]+\.log` извлекает:
- группа 1 → `namespace = nextalk`
- группа 2 → `pod = guild-service-78d7cb8f45-4gp2b`
- группа 3 → `container = guild-service` (= service label)

Kubernetes API при этом не нужен.

### 3. Парсинг логов

`stage.cri {}` - снимает prefixes containerd: `2026-05-29T10:00:00Z stdout F {...}`

`stage.json { drop_malformed = false }` - парсит JSON. `drop_malformed = false` нужен потому что LiveKit, Prometheus, Zitadel пишут plain text - их логи не дропаются, проходят с `level=Information`.

---

## Хронология проблем и фиксов

### 1. CoreDNS не резолвил acme-v02.api.letsencrypt.org

**Симптом:** ClusterIssuer `letsencrypt-prod` завис в `READY=False`. cert-manager не мог зарегистрировать ACME-аккаунт.

**Причина:** Beget выдает нодам DNS `198.18.18.18` (внутренний резолвер). Этот IP доступен с хостового интерфейса ноды, но **недоступен из pod-сети** через flannel VXLAN - CoreDNS получал `i/o timeout` и возвращал `SERVFAIL`.

**Фикс:** В `cluster-addons.yml` - задача патчит CoreDNS ConfigMap (форвардер `/etc/resolv.conf` → `8.8.8.8 1.1.1.1`), удаляет аннотацию `objectset.rio.cattle.io/applied` чтобы k3s-контроллер не откатил патч.

Постоянный фикс: в `roles/k3s_server` создается `/etc/k3s-resolv.conf` с публичными DNS, в `config.yaml.j2` прописано `resolv-conf: /etc/k3s-resolv.conf`. Свежий кластер сразу получает правильный DNS.

> **НИКОГДА не делать `kubectl rollout restart deployment/coredns`.** Если новый под не может подтянуть образ - DNS ляжет полностью. CoreDNS сам перечитывает ConfigMap через reload-плагин (~30 сек).

### 2. ingress-nginx: chart download завис

**Причина:** `release-assets.githubusercontent.com` (Cloudflare) заблокирован в РФ - Helm не мог скачать чарт.

**Фикс:** В `cluster-addons.yml` добавлена проверка существующего DaemonSet перед Helm install. Если DaemonSet уже есть - установка пропускается (`when: ingress_ds_check.rc != 0`).

### 3. loki.source.kubernetes не видит hostNetwork-поды

**Симптом:** Alloy собирал логи guild-service, messaging-service, websocket-gateway, но не видел LiveKit, Prometheus, Zitadel.

**Причина:** `loki.source.kubernetes` использует pod IP для адресации. У hostNetwork-подов `pod IP = IP ноды` - внутренняя адресация компонента ломается, поды не обнаруживаются как targets.

**Фикс:** Переход на `loki.source.file` - читает файлы напрямую из `/var/log/pods`, покрывает все поды без исключений.

### 4. Alloy не мог достучаться до Loki (10.19.0.41:3100)

**Причина:** В pod-сети Flannel (10.42.x.x) маршрут до obs-vps работает (пакеты NAT-ятся через хостовой интерфейс ноды). Но в момент отладки NetworkPolicy не имела нужного egress-правила, что создавало иллюзию недоступности.

**Фикс:** Добавлен `hostNetwork: true` + `dnsPolicy: ClusterFirstWithHostNet` - Alloy использует сетевой стек ноды, где obs-vps напрямую доступен по приватной сети Beget.

> Примечание: Prometheus `remote_write` и OTel traces работают в pod-сети без hostNetwork - они ходят через тот же NetworkPolicy egress `10.0.0.0/8`. Если нужно убрать hostNetwork у Alloy, достаточно убедиться что egress `10.0.0.0/8:3100` есть в NetworkPolicy.

### 5. Alloy не мог достучаться до Kubernetes API (10.43.0.1:443) с control-plane нод

**Симптом:** `dial tcp 10.43.0.1:443: connect: network is unreachable` на 3 из 6 нод (control-plane). На worker-нодах работало.

**Причина:** С `hostNetwork: true` Alloy использует host network namespace. На worker-нодах kube-proxy/flannel создает iptables-правила для ClusterIP `10.43.0.1`, трафик DNAT-ится на локальный kube-apiserver. На control-plane нодах эти правила настроены иначе - прямого маршрута до ClusterIP нет.

**Фикс:** Убрать зависимость от Kubernetes API полностью - заменить `discovery.kubernetes` на `local.file_match` с извлечением меток из пути файла. Теперь Alloy не обращается к `10.43.0.1` вообще.

### 6. permission denied на /var/lib/alloy/data

**Симптом:** `mkdir /var/lib/alloy/data: permission denied` при старте Alloy.

**Причина:** `readOnlyRootFilesystem: true` - директория `/var/lib/alloy` отсутствует в rootfs образа как создаваемый путь. Kubelet не может сделать ее в read-only rootfs, `os.MkdirAll` падает.

**Фикс:** `--storage.path=/tmp/alloy-data` вместо `/var/lib/alloy/data`. `/tmp` смонтирован как emptyDir (writable), Alloy создает подпапку внутри него без проблем.

---

## Параметры DaemonSet: почему именно так

| Параметр | Значение | Причина |
|---|---|---|
| `hostNetwork: true` | да | Прямой доступ к Loki 10.19.0.41:3100 через сеть ноды |
| `dnsPolicy` | `ClusterFirstWithHostNet` | При hostNetwork нужен явный DNS, иначе не работает резолвинг Kubernetes-имен |
| `runAsUser: 0` | root | containerd пишет файлы логов как root:root 600 - без root Alloy не может читать `/var/log/pods` |
| `readOnlyRootFilesystem: true` | да | Hardening; writable пути - только `/tmp` (emptyDir) и `/var/log/pods` (read-only hostPath) |
| `capabilities: drop: ["ALL"]` | да | Root без capabilities достаточен для чтения файлов |
| `--storage.path=/tmp/alloy-data` | `/tmp` | `/var/lib/alloy` недоступен при readOnlyRootFilesystem |
| toleration control-plane | да | DaemonSet должен работать на всех 6 нодах |

---

## Проверка работоспособности

```bash
# Все Alloy поды Running
kubectl get pods -n nextalk -l app=alloy -o wide

# Логи без ошибок
kubectl logs -n nextalk <pod-name>

# Loki получает лейблы (должен вернуть namespace, pod, container, level, service)
curl http://10.19.0.41:3100/loki/api/v1/labels

# Запрос логов конкретного сервиса
curl -G http://10.19.0.41:3100/loki/api/v1/query \
  --data-urlencode 'query={service="guild-service"} | json' \
  --data-urlencode 'limit=10'
```

---

## Что еще не сделано

| Задача | Приоритет | Примечание |
|---|---|---|
| node-exporter | высокий | Нет метрик CPU/RAM/disk нод - незаметный OOM/disk full |
| OOMKilled + PostgreSQL connections алерты | средний | В Grafana managed alerts пока нет этих правил (CrashLoop, error rate, cert expiry, latency - есть) |
| Frontend мониторинг | низкий | React SPA не инструментирована - нет RUM, нет JS-ошибок в Loki |
