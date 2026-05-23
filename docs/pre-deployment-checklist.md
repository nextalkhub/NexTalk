# Pre-deployment checklist

Проверка перед `ansible-playbook playbooks/site.yml` либо ручным `helm-deploy.yml`. Каждый пункт — самодостаточный: команда + ожидаемый результат + что чинить если не так + ссылка на исходник. Можно отдавать другому агенту по одному пункту.

Все пути — от корня репо `c:\Users\Danil\Desktop\Study\Architecture\NexTalk`.

Связано: [deployment.md](deployment.md), [security.md](security.md), [decisions.md](decisions.md).

---

## Фаза 0. Внешние пререквизиты (вне репо)

### 0.1 Заказаны 8 VPS Beget

| Роль | Hostname | Private IP | Public IP |
|:--|:--|:--|:--|
| control-plane-1 | control-plane-1 | 10.19.0.11 | — |
| control-plane-2 | control-plane-2 | 10.19.0.12 | — |
| control-plane-3 | control-plane-3 | 10.19.0.13 | — |
| worker-1 (bastion) | worker-1 | 10.19.0.21 | да, статический |
| worker-2 | worker-2 | 10.19.0.22 | да, статический |
| worker-3 | worker-3 | 10.19.0.23 | да, статический |
| db-vps | db-vps | 10.19.0.31 | — |
| observability-vps | observability-vps | 10.19.0.41 | опц. для Grafana |

Reference: [deployment.md §6.2](deployment.md#62-ip-план).
**Проверка:** SSH через bastion на каждую — `ssh -J root@<worker-1-public> root@10.19.0.<N>` отвечает.
**Если не так:** см. [ssh-access.md](ssh-access.md), убедись что private network у Beget включена и IP назначены.

### 0.2 DNS A-записи указывают на 3 публичных IP worker'ов

```
nextalk.fun.            A    <worker-1-public-ip>
nextalk.fun.            A    <worker-2-public-ip>
nextalk.fun.            A    <worker-3-public-ip>
auth.nextalk.fun.       A    <worker-1-public-ip>
auth.nextalk.fun.       A    <worker-2-public-ip>
auth.nextalk.fun.       A    <worker-3-public-ip>
```

Reference: [deployment.md §7.2](deployment.md#72-dns-записи).
**Проверка:** `dig +short nextalk.fun` возвращает 3 IP, совпадающих с public IP worker'ов.
**Если не так:** записи не пропагировались (ждать до 30 мин) или ошибка в DNS-панели регистратора. Пока DNS не пропагирован, HTTP-01 challenge cert-manager упадёт.

### 0.3 Email для Let's Encrypt существует и читается

Письма от LE про expiry уходят на `vault_acme_email` ([vault.yml.example:41](../infra/ansible/inventory/group_vars/vault.yml.example#L41)). По соглашению — `ops@nextalk.fun` / `admin@nextalk.fun`, не личный.
**Если не так:** при истечении сертификата (90 дней) предупреждение пройдёт мимо.

### 0.4 Docker-образы запушены в ghcr.io с конкретным тегом

Список образов из [values.yaml:145-178](../charts/nextalk/values.yaml#L145-L178):
- `ghcr.io/nextalkhub/nextalk/guild-service:<tag>`
- `ghcr.io/nextalkhub/nextalk/messaging-service:<tag>`
- `ghcr.io/nextalkhub/nextalk/voice-service:<tag>`
- `ghcr.io/nextalkhub/nextalk/websocket-gateway:<tag>`
- `ghcr.io/nextalkhub/nextalk/web-spa:<tag>`

**Проверка:** `docker manifest inspect ghcr.io/nextalkhub/nextalk/guild-service:<tag>` для каждого — не возвращает 404.
**Если не так:** прогнать CI workflow по сборке (ищи `.github/workflows/ci*.yml` / `build*.yml`) на нужном коммите. Без всех 5 образов helm-deploy упадёт на ImagePullBackOff.

### 0.5 Репо ghcr.io/nextalkhub/nextalk/* публичный

Reference: [decisions.md строка "ghcr.io visibility"](decisions.md). Если репо приватный — потребуется `imagePullSecret`, его в чарте сейчас нет.
**Проверка:** в браузере открыть `https://github.com/nextalkhub/packages` от анонимуса — образы видны.

---

## Фаза 1. Локальные secret-файлы (gitignored)

Эти файлы перечислены в [infra/ansible/.gitignore](../infra/ansible/.gitignore). Перед прогоном playbook'ов локально их нужно создать. Для CI они приходят из GH secrets — см. Фаза 2.

### 1.1 `infra/ansible/inventory/hosts.ini` создан

**Создать:** `cp infra/ansible/inventory/hosts.ini.example infra/ansible/inventory/hosts.ini`
**Заполнить:** заменить `public_ip=CHANGE_ME` на реальные public IP трёх worker'ов.
Reference: [hosts.ini.example](../infra/ansible/inventory/hosts.ini.example).
**Проверка:** `ansible-inventory -i infra/ansible/inventory/hosts.ini --list` парсит без ошибок, в выводе для worker'ов поле `public_ip` — реальный IP.

### 1.2 `infra/ansible/inventory/group_vars/vault.yml` создан и зашифрован

**Создать:**
```bash
cp infra/ansible/inventory/group_vars/vault.yml.example infra/ansible/inventory/group_vars/vault.yml
```
**Сгенерировать 7 значений** по комментариям в [vault.yml.example](../infra/ansible/inventory/group_vars/vault.yml.example):
- `vault_k3s_token` — `openssl rand -hex 32`
- `vault_postgres_password` — `openssl rand -base64 32`
- `vault_redis_password` — `openssl rand -base64 32`
- `vault_zitadel_masterkey` — `openssl rand -hex 16` (ровно 32 символа)
- `vault_livekit_api_key` — `openssl rand -hex 8` (опц. префикс `APIxxx`)
- `vault_livekit_secret_key` — `openssl rand -base64 32`
- `vault_acme_email` — реальный из 0.3

**Зашифровать:** `ansible-vault encrypt infra/ansible/inventory/group_vars/vault.yml`
**Проверка:** `head -1 vault.yml` начинается с `$ANSIBLE_VAULT;1.1;AES256`. **Содержимое в plain не коммитить** — gitignored ([.gitignore:5](../infra/ansible/.gitignore#L5)).

### 1.3 Vault-пароль доступен ansible'у

Один из двух вариантов:
- `--ask-vault-pass` при каждом запуске
- `export ANSIBLE_VAULT_PASSWORD_FILE=~/.ansible_vault_pass` + `echo '<pass>' > ~/.ansible_vault_pass && chmod 600 ~/.ansible_vault_pass`

**Проверка:** `ansible-vault view infra/ansible/inventory/group_vars/vault.yml` показывает plain.

### 1.4 SSH-ключ для ansible разложен на 8 VPS

Один и тот же приватный ключ (ed25519 рекомендуется) есть в `~/.ssh/`, его публичная часть лежит в `~/.ssh/authorized_keys` на всех 8 VPS под пользователем, у которого есть sudo.
Reference: [ssh-access.md](ssh-access.md), роль [ssh_keys](../infra/ansible/roles/ssh_keys).
**Проверка:** `ansible all -i infra/ansible/inventory/hosts.ini -m ping` возвращает `pong` для всех 8 хостов.

---

## Фаза 2. GitHub Actions secrets (только если деплоим через CI)

Только для workflow [deploy.yml](../.github/workflows/deploy.yml). Если деплоим вручную с локалки — пропустить ВСЮ фазу.

> **⚠ Известные блокеры CI** ([decisions.md](decisions.md) → раздел Отложено):
> - Helm CLI не установлен на runner
> - kubeconfig указывает на VIP `10.19.0.10` в приватной сети Beget — runner туда не достучится
>
> До разрешения этих двух — CI workflow не сработает. Деплоим вручную из локалки.

| Secret name | Значение | Источник |
|:--|:--|:--|
| `ANSIBLE_SSH_PRIVATE_KEY` | Содержимое приватного SSH-ключа из 1.4 | `cat ~/.ssh/id_ed25519` |
| `BASTION_HOST` | Public IP worker-1 | из 0.1 |
| `ANSIBLE_VAULT_PASSWORD` | Пароль ansible-vault из 1.3 | то, что вводилось при `ansible-vault encrypt` |
| `ANSIBLE_VAULT_YML` | Целиком зашифрованный vault.yml | `cat infra/ansible/inventory/group_vars/vault.yml` (уже AES) |
| `ANSIBLE_HOSTS_INI` | Целиком hosts.ini с реальными IP | `cat infra/ansible/inventory/hosts.ini` |
| `KUBECONFIG_B64` | kubeconfig (после Фазы 4.3) в base64 | `base64 -w0 infra/ansible/kubeconfig` |

**Проверка:** `gh secret list -e production` — все 6 в списке.
Reference: [deploy.yml:32-76](../.github/workflows/deploy.yml#L32-L76).

---

## Фаза 3. Проверка чарта без живого кластера

Можно прогнать локально, до подъёма k3s.

### 3.1 `helm lint` проходит

```bash
helm lint charts/nextalk
```
**Ожидаемо:** `0 chart(s) failed`.
**Если не так:** ошибки в шаблонах. Чинить указанный файл.

### 3.2 `helm template` со всеми обязательными values рендерится

Без vault-values чарт **обязан упасть** на `required` для `db.host`, `db.redisHost`, `tls.email` — это валидация.

С полными values (как в deploy):
```bash
ansible-playbook -i infra/ansible/inventory/hosts.ini infra/ansible/playbooks/helm-deploy.yml --tags helm --check
```
Или вручную: рендерить [helm-secrets.values.yaml.j2](../infra/ansible/playbooks/templates/helm-secrets.values.yaml.j2) и
```bash
helm template charts/nextalk -f charts/nextalk/values.yaml -f /tmp/secrets.yaml
```
**Ожидаемо:** валидный YAML, нет `<no value>` в Secret'ах.
**Если не так:** недостающий ключ в `vault.yml` либо в [helm-secrets.values.yaml.j2](../infra/ansible/playbooks/templates/helm-secrets.values.yaml.j2). Полный список `required`-полей по чарту (упадут если пусты):

| Поле | Где |
|:--|:--|
| `postgres.password` | [secrets.yaml:9](../charts/nextalk/templates/secrets.yaml#L9) |
| `db.host` | [secrets.yaml:15](../charts/nextalk/templates/secrets.yaml#L15) |
| `db.redisPassword` | [secrets.yaml:18](../charts/nextalk/templates/secrets.yaml#L18) |
| `livekit.apiKey` | [secrets.yaml:19](../charts/nextalk/templates/secrets.yaml#L19) |
| `livekit.secretKey` | [secrets.yaml:20](../charts/nextalk/templates/secrets.yaml#L20) |
| `zitadel.masterkey` | [secrets.yaml:21](../charts/nextalk/templates/secrets.yaml#L21) |
| `db.redisHost` | [guild-service.yaml](../charts/nextalk/templates/guild-service.yaml), [websocket-gateway.yaml](../charts/nextalk/templates/websocket-gateway.yaml), [livekit.yaml](../charts/nextalk/templates/livekit.yaml) |
| `tls.email` | [clusterissuer.yaml:13,31](../charts/nextalk/templates/clusterissuer.yaml#L13) |

---

## Фаза 4. Прогон infra-playbook'ов

Порядок строго как в [site.yml](../infra/ansible/playbooks/site.yml). Каждый шаг — отдельный playbook, можно запускать по одному (idempotent).

Все команды — из `infra/ansible/`.

### 4.1 bootstrap — пакеты, sysctl, ufw на 8 нодах

```bash
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml
```
**Что делает:** swapoff, sysctl `br_netfilter`, базовые пакеты, ufw allow по [deployment.md §6.3](deployment.md#63-firewall-ufw), NTP. См. роли [common](../infra/ansible/roles/common), [ufw](../infra/ansible/roles/ufw).
**Проверка после:** на каждой ноде `swapon --show` пуст, `sysctl net.bridge.bridge-nf-call-iptables` = 1, `ufw status` — правила есть.
**Если падает:** обычно либо нет sudo (см. 1.4), либо нет интернета у ноды для `apt`. Проверь приватную сеть и default route.

### 4.2 db — PostgreSQL 18 + Redis на db-vps

```bash
ansible-playbook -i inventory/hosts.ini playbooks/db.yml
```
**Что делает:** ставит postgres + redis из системных пакетов, создаёт user `nextalk_app` и БД `nextalk` + `zitadel` (один user на обе БД — см. [group_vars/db.yml](../infra/ansible/inventory/group_vars/db.yml)). Bind на private IP. Пароли из vault.
**Проверка после:**
```bash
# С любого worker'а:
psql "postgresql://nextalk_app:<vault_postgres_password>@10.19.0.31:5432/nextalk" -c '\l'
redis-cli -h 10.19.0.31 -a <vault_redis_password> ping  # PONG
```
**Если падает:** `community.postgresql.postgresql_user` ругается на `role_attr_flags` для системного `postgres` — наш user `nextalk_app` другой, не должно случиться. Если случилось — читать [roles/postgres/tasks/main.yml](../infra/ansible/roles/postgres/tasks/main.yml).

### 4.3 k3s — HA control-plane + agents + получение kubeconfig

```bash
ansible-playbook -i inventory/hosts.ini playbooks/k3s.yml
```
**Что делает:**
1. Кладёт kube-vip DaemonSet manifests на 3 control-plane ноды ([role kube_vip](../infra/ansible/roles/kube_vip)).
2. `serial: 1` — ставит k3s server на control-plane-1 с `--cluster-init`, ждёт apiserver, потом control-plane-2/3 через VIP `https://10.19.0.10:6443`.
3. Ставит k3s agent на 3 worker'ах.
4. **Главное:** скачивает kubeconfig с control-plane-1, **заменяет `127.0.0.1` → `10.19.0.10` (VIP)**, кладёт в `infra/ansible/kubeconfig`. См. [k3s_server/tasks/main.yml:104-119](../infra/ansible/roles/k3s_server/tasks/main.yml#L104-L119).

**Проверка после:**
```bash
export KUBECONFIG=infra/ansible/kubeconfig
kubectl get nodes  # 3 control-plane Ready + 3 worker Ready, 6 строк
kubectl get pods -n kube-system | grep kube-vip  # 3 пода Running
```
**Если `kubectl get nodes` не работает с локалки:** ожидаемо — у тебя нет route до 10.19.0.10. Это [decisions.md → Достижимость k3s API с CI-runner](decisions.md). Для проверки сделать SSH-tunnel:
```bash
ssh -L 6443:10.19.0.10:6443 -J root@<worker-1-public> root@10.19.0.11 -N &
# Подправить kubeconfig: server: https://127.0.0.1:6443 + insecure-skip-tls-verify
```
Либо `kubectl` запускать прямо на control-plane: `ssh root@control-plane-1 'kubectl get nodes'`.
**Если control-plane-2/3 не присоединяются:** VIP не поднялся. На control-plane-1: `ip addr show | grep 10.19.0.10` — должен быть. Иначе смотри `journalctl -u k3s` и логи kube-vip пода.

### 4.4 cluster-addons — ingress-nginx + cert-manager

Прогоняется с локалки (`hosts: localhost`), требует kubeconfig из 4.3.
```bash
ansible-playbook -i inventory/hosts.ini playbooks/cluster-addons.yml
```
**Что делает:** см. [cluster-addons.yml](../infra/ansible/playbooks/cluster-addons.yml). Ставит ingress-nginx как DaemonSet с `hostNetwork: true` (слушает 80/443 на public IP worker'ов напрямую, без LoadBalancer/NodePort) и cert-manager с CRDs.
**Проверка после:**
```bash
kubectl get pods -n ingress-nginx  # DaemonSet, по поду на worker — 3 Running
kubectl get pods -n cert-manager   # 3 пода Running (controller, webhook, cainjector)
kubectl get crd | grep cert-manager.io  # 6+ CRD: Certificate, ClusterIssuer, ...
# Внешняя проверка:
curl -I http://<любой-worker-public-ip>  # 404 от nginx — это OK, ingress слушает
```
**Если падает:** обычно либо kubeconfig недоступен с локалки (см. 4.3), либо нет интернета у control-plane/worker для скачивания чарта/CRD.

### 4.5 observability — Loki + Prometheus + Tempo + Grafana на obs-vps

```bash
ansible-playbook -i inventory/hosts.ini playbooks/observability.yml
```
**Что делает:** docker + docker-compose на obs-vps, поднимает 4 сервиса из [docker-compose.yaml.j2](../infra/ansible/roles/observability/templates/docker-compose.yaml.j2). Реально работает **Tempo** для трасс (НЕ Jaeger, хотя в [infra/observability/](../infra/observability/) лежат старые конфиги jaeger/otel-collector — они не используются compose-файлом). См. роли [docker](../infra/ansible/roles/docker), [observability](../infra/ansible/roles/observability).

| Сервис | Порт | Назначение |
|:--|:--|:--|
| prometheus | 9090 | scrape + приём remote_write от in-cluster Prometheus |
| loki | 3100 | приём логов от Alloy |
| tempo | 4317 (OTLP gRPC), 4318 (OTLP HTTP), 3200 (HTTP API) | приём трасс |
| grafana | 3000 | UI |

**Проверка после (изнутри приватной сети, через bastion):**
```bash
curl http://10.19.0.41:9090/-/healthy   # Prometheus → "Prometheus Server is Healthy."
curl http://10.19.0.41:3100/ready       # Loki → "ready"
curl http://10.19.0.41:3200/ready       # Tempo → "ready"
curl -I http://10.19.0.41:3000          # Grafana → 302 на /login
```
**Если падает:** ufw на obs-vps не пускает с private CIDR `10.19.0.0/16` — проверь [deployment.md §6.3](deployment.md#63-firewall-ufw).

> **Соответствие чарта:** [values.yaml:99-104](../charts/nextalk/values.yaml#L99) использует `tempoUrl: http://10.19.0.41:3200` для HTTP API Tempo. Трейсы шлются по `otelEndpoint: http://10.19.0.41:4317` (OTLP gRPC).

---

## Фаза 5. Готовность кластера к app-деплою

### 5.1 Образы доступны изнутри кластера

С любого worker'а:
```bash
sudo k3s crictl pull ghcr.io/nextalkhub/nextalk/guild-service:<tag>
```
Должен скачаться. Аналогично для остальных 4 образов из 0.4.
**Если `unauthorized`:** репо приватный (см. 0.5).

### 5.2 cert-manager доступен и ClusterIssuer применится

После helm-deploy чарт создаст `ClusterIssuer letsencrypt-prod` и `letsencrypt-staging` ([clusterissuer.yaml](../charts/nextalk/templates/clusterissuer.yaml)). На случай первичной валидации — сначала рекомендую переключить [values.yaml:37](../charts/nextalk/values.yaml#L37) на `letsencrypt-staging`, провалидировать HTTP-01 челлендж (LE rate-limit: 5 серт / неделю на prod), потом вернуть на prod.

### 5.3 DNS пропагирован (см. 0.2)

Без этого cert-manager не сможет пройти HTTP-01.

---

## Фаза 6. Helm deploy

### 6.1 Запуск

С локалки (требует kubeconfig из 4.3 + vault.yml расшифрован):
```bash
ansible-playbook -i infra/ansible/inventory/hosts.ini \
  infra/ansible/playbooks/helm-deploy.yml \
  -e image_tag=<sha-или-semver>
```
**Что делает:** рендерит [helm-secrets.values.yaml.j2](../infra/ansible/playbooks/templates/helm-secrets.values.yaml.j2) во временный файл `.helm-secrets.values.yaml` ([gitignored](../infra/ansible/.gitignore#L16)), запускает `helm upgrade --install nextalk` с двумя `-f` (values.yaml + rendered secrets) + `--set image.tag=...` для всех 5 сервисов. `atomic: true` + `wait: true` + `timeout: 10m` — при ошибке откатит.
Reference: [helm-deploy.yml](../infra/ansible/playbooks/helm-deploy.yml).

### 6.2 Проверки сразу после

```bash
kubectl get pods -n nextalk
# Все Running, 0 Pending/CrashLoopBackOff. Должно быть:
#   guildService x2, messagingService x2, voiceService x2,
#   websocketGateway x2, webSpa x2, zitadel x1, livekit x1, prometheus x1,
#   alloy — DaemonSet, по поду на КАЖДУЮ ноду k3s (включая control-plane,
#   так как в alloy.yaml:108-112 есть toleration для control-plane).
#   3 control-plane + 3 worker = 6 подов alloy.

kubectl get certificate -n nextalk
# nextalk-tls и auth-nextalk-tls — READY=True (может занять 1-2 мин на ACME)

kubectl get ingress -n nextalk
# 3 ingress объекта (nextalk-api, nextalk-grpc-web, nextalk-main + zitadel)
```
**Если `CrashLoopBackOff`:** `kubectl logs -n nextalk <pod>` — обычно либо connection refused к Postgres/Redis (проверь 4.2), либо `zitadel masterkey` не 32 символа (проверь 1.2).
**Если Certificate не Ready долго:** `kubectl describe certificate <name> -n nextalk` + `kubectl get challenges -A` — обычно DNS ещё не пропагирован (0.2) или ingress-nginx не доступен снаружи.

---

## Фаза 7. Smoke

### 7.1 HTTPS работает

```bash
curl -I https://nextalk.fun         # 200/301 от webSpa
curl -I https://auth.nextalk.fun    # 200/302 от Zitadel
```
**Если 502/503:** ingress есть, но upstream не отвечает. `kubectl get endpoints -n nextalk` — у Service должны быть IP подов.
**Если TLS error / self-signed:** Certificate не Ready, см. 6.2.

### 7.2 OIDC discovery

```bash
curl https://auth.nextalk.fun/.well-known/openid-configuration | jq .issuer
# "https://auth.nextalk.fun"
```
**Если issuer без https или с :port:** см. [decisions.md → "Принято: :port в Zitadel URL'ах"](decisions.md).

### 7.3 Логин на фронте

Открыть https://nextalk.fun → попасть на Zitadel auth → залогиниться → вернуться → видеть UI.

---

## Известные проблемы и блокеры

Перед стартом — прочитать [decisions.md → "Отложено"](decisions.md). Конкретно про деплой:
- **Helm CLI на CI-runner** — не установлен, пока деплоим вручную с локалки
- **k3s API с CI-runner** — недостижим через интернет, требует tunnel или делегирования (4 варианта в decisions.md)
- **TLS на Postgres** — `sslmode=prefer`, не `require`. БД в приватной сети, осознанно
- **etcd snapshots в S3** — локальные only
- **Zitadel HA** — 1 реплика

Если что-то из перечисленного перестало быть приемлемым — обновить decisions.md и сделать.
