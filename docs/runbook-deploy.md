# Runbook: первый деплой NexTalk в k3s

Стартовая точка: 8 VPS Beget куплены и доступны, домен `nextalk.fun` зарегистрирован, есть аккаунт GitHub с правом push в `ghcr.io/nextalkhub/nextalk/*`. Финиш: открывается `https://nextalk.fun`, логин через `https://auth.nextalk.fun`.

Связано:
- [pre-deployment-checklist.md](pre-deployment-checklist.md) — что должно быть готово (с обоснованиями)
- [deployment.md](deployment.md) — физическая топология
- [decisions.md](decisions.md) — какие компромиссы осознанно отложены

**Все команды — для Linux/macOS shell.** На Windows работай в **WSL2** (Ubuntu 22.04+): ansible-playbook нативно под Windows не работает, и helm/kubectl там же удобнее.

**Все пути — от корня репо** `~/projects/NexTalk` (подставь свой).

---

## Шаг 0. Подготовка локальной машины

### 0.1 Установи WSL2 (если на Windows)

PowerShell с правами админа:
```powershell
wsl --install -d Ubuntu-22.04
```
После reboot — открыть Ubuntu, создать пользователя.

Дальше **все команды — из WSL Ubuntu**, не из PowerShell/cmd.

### 0.2 Поставь нужные тулзы в WSL

```bash
# Базовое
sudo apt update
sudo apt install -y curl jq git python3-pip openssl rsync

# Ansible (последний стабильный)
sudo apt install -y ansible

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl

# Helm
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 0.3 Проверь версии

```bash
ansible --version    # >= 2.15
kubectl version --client    # >= 1.28
helm version    # >= v3.14
```

### 0.4 Поставь нужные Ansible-коллекции

```bash
cd ~/projects/NexTalk
ansible-galaxy collection install -r infra/ansible/requirements.yml
```
Это поставит `kubernetes.core`, `community.postgresql`, `community.docker`, `ansible.posix`.

---

## Шаг 1. Pre-flight: SSH доступ к 8 VPS

### 1.1 Сгенерируй ed25519-ключ для деплоя

```bash
ssh-keygen -t ed25519 -C "ansible-deploy-nextalk" -f ~/.ssh/nextalk_deploy
# passphrase пусть пустой (это deploy key, не личный)
```

Получишь два файла: `~/.ssh/nextalk_deploy` (приватный) и `~/.ssh/nextalk_deploy.pub` (публичный).

### 1.2 Разложи **публичный** ключ на 8 VPS

Через web-консоль Beget, для каждой из 8 VPS, добавь содержимое `nextalk_deploy.pub` в `~/.ssh/authorized_keys` пользователя `root`. Альтернативно — `ssh-copy-id` если есть временный пароль:

```bash
for ip in <8 public-or-temp IP>; do
  ssh-copy-id -i ~/.ssh/nextalk_deploy.pub root@$ip
done
```

После раскатки — отключи парольный SSH (`PasswordAuthentication no` в `/etc/ssh/sshd_config`). Bootstrap playbook не делает этого автоматически (см. [bootstrap.yml:33](../infra/ansible/playbooks/bootstrap.yml#L33) — `ssh_keys_disable_passwords: false` по умолчанию).

### 1.3 Настрой `~/.ssh/config` (опционально, для ручного SSH)

```ssh
Host nextalk-bastion
    HostName <public-IP-worker-1>
    User root
    IdentityFile ~/.ssh/nextalk_deploy

Host nextalk-*
    User root
    IdentityFile ~/.ssh/nextalk_deploy
    ProxyJump nextalk-bastion

Host nextalk-control-plane-1
    HostName 10.19.0.11
Host nextalk-control-plane-2
    HostName 10.19.0.12
Host nextalk-control-plane-3
    HostName 10.19.0.13
Host nextalk-worker-2
    HostName 10.19.0.22
Host nextalk-worker-3
    HostName 10.19.0.23
Host nextalk-db
    HostName 10.19.0.31
Host nextalk-obs
    HostName 10.19.0.41
```

**Проверка:** `ssh nextalk-control-plane-1 hostname` отвечает `control-plane-1`.

### 1.4 Проверь, что приватная сеть Beget работает

С любой VPS:
```bash
ssh nextalk-bastion 'ping -c2 10.19.0.31'  # пинг до db-vps
```
**Ожидаемо:** `0% packet loss`.
**Если 100% loss:** в панели Beget включи приватную сеть для всех 8 VPS и проверь, что назначены IP из `10.19.0.0/16`.

### 1.5 Определи имя интерфейса приватной сети

В [group_vars/all.yml:28](../infra/ansible/inventory/group_vars/all.yml#L28) написано `private_iface: "eth1"`. Beget может назвать иначе. С любой VPS:
```bash
ssh nextalk-control-plane-1 'ip -br addr'
```
**Найди интерфейс с IP `10.19.0.X/16`.** Если он не `eth1` (а, например, `ens4` или `enp7s0`) — **отредактируй** [group_vars/all.yml:28](../infra/ansible/inventory/group_vars/all.yml#L28) под реальное имя.

---

## Шаг 2. DNS-настройка (через панель регистратора)

Reference: [deployment.md §7.2](deployment.md#72-dns-записи).

В DNS-зоне `nextalk.fun` добавь A-записи на **публичные IP трёх worker'ов** (получи из панели Beget):

```
nextalk.fun.            A    <worker-1-public-ip>
nextalk.fun.            A    <worker-2-public-ip>
nextalk.fun.            A    <worker-3-public-ip>

auth.nextalk.fun.       A    <worker-1-public-ip>
auth.nextalk.fun.       A    <worker-2-public-ip>
auth.nextalk.fun.       A    <worker-3-public-ip>
```

**TTL:** 300 (5 минут) на время первого деплоя — позволит быстро перенастроить если ошибся.

**Проверка после 5-30 минут:**
```bash
dig +short nextalk.fun
dig +short auth.nextalk.fun
```
Оба должны вернуть **3 IP**, совпадающих с public IP worker'ов.

**Если не возвращает:** DNS ещё пропагируется. Дождись. **Без пропагированного DNS cert-manager не выпустит сертификат** на шаге 6 (HTTP-01 челлендж провалится).

---

## Шаг 3. Сборка и push образов в ghcr.io

### 3.1 GitHub PAT с правом `write:packages`

В Github → Settings → Developer settings → Personal access tokens (classic) → Generate. Scopes: `write:packages`, `read:packages`.

### 3.2 Залогинься в ghcr из WSL

```bash
echo <PAT> | docker login ghcr.io -u <github-username> --password-stdin
```

### 3.3 Прогон CI workflow либо локальный build+push

Если у тебя есть CI workflow для сборки (ищи `.github/workflows/build*.yml` / `ci.yml`):
```bash
gh workflow run ci.yml --ref deploy-k3s-ha
gh run watch
```

Иначе — локально для каждого сервиса (пример для guild-service):
```bash
docker build -t ghcr.io/nextalkhub/nextalk/guild-service:0.1.0 \
  -f src/guild-service/Dockerfile .
docker push ghcr.io/nextalkhub/nextalk/guild-service:0.1.0
```
Аналогично для **messaging-service, voice-service, websocket-gateway, web-spa** (см. [values.yaml:145-178](../charts/nextalk/values.yaml#L145-L178)).

### 3.4 Сделай ghcr репо публичными

В Github → packages — для каждого из 5 пакетов: Package settings → Change visibility → Public. Без этого нужен `imagePullSecret` (в чарте его нет — см. [decisions.md](decisions.md) → "ghcr.io visibility").

### 3.5 Проверь, что образы доступны

```bash
for svc in guild-service messaging-service voice-service websocket-gateway web-spa; do
  echo "=== $svc ==="
  docker manifest inspect ghcr.io/nextalkhub/nextalk/$svc:0.1.0 > /dev/null \
    && echo OK || echo MISSING
done
```
Должно быть 5 раз `OK`.

---

## Шаг 4. Локальные secret-файлы

### 4.1 Создай `hosts.ini` с реальными IP

```bash
cd ~/projects/NexTalk
cp infra/ansible/inventory/hosts.ini.example infra/ansible/inventory/hosts.ini
```

Отредактируй `infra/ansible/inventory/hosts.ini` — замени **3** строки `public_ip=CHANGE_ME` на реальные public IP worker'ов.

**Проверка:**
```bash
ansible-inventory -i infra/ansible/inventory/hosts.ini --list | jq '.workers'
```
Видны 3 worker'а, у каждого `public_ip` — реальный IP.

### 4.2 Создай `vault.yml` и сгенерируй секреты

```bash
cp infra/ansible/inventory/group_vars/vault.yml.example \
   infra/ansible/inventory/group_vars/vault.yml
```

Сгенерируй 7 значений:
```bash
echo "vault_k3s_token: $(openssl rand -hex 32)"
echo "vault_postgres_password: $(openssl rand -base64 32)"
echo "vault_redis_password: $(openssl rand -base64 32)"
echo "vault_zitadel_masterkey: $(openssl rand -hex 16)"   # ровно 32 символа hex
echo "vault_livekit_api_key: API$(openssl rand -hex 8)"
echo "vault_livekit_secret_key: $(openssl rand -base64 32)"
```

Скопируй вывод и **вставь в `vault.yml`** на место `REPLACE_ME`. Для `vault_acme_email` подставь реальный (например `ops@nextalk.fun`).

> **Проверка masterkey:** длина строго 32 символа.
> ```bash
> awk -F'"' '/vault_zitadel_masterkey/{print length($2)}' infra/ansible/inventory/group_vars/vault.yml
> ```
> Должно вывести `32`. Иначе Zitadel упадёт с `masterkey must be 32 bytes`.

### 4.3 Зашифруй vault.yml

```bash
# Придумай и запомни пароль (понадобится при каждом playbook run)
ansible-vault encrypt infra/ansible/inventory/group_vars/vault.yml
```

**Проверка:**
```bash
head -1 infra/ansible/inventory/group_vars/vault.yml
# $ANSIBLE_VAULT;1.1;AES256
```

### 4.4 Положи vault-пароль в файл, чтобы не вводить руками

```bash
echo "<твой-vault-пароль>" > ~/.ansible_vault_pass
chmod 600 ~/.ansible_vault_pass
export ANSIBLE_VAULT_PASSWORD_FILE=~/.ansible_vault_pass
# Допиши последнюю строку в ~/.bashrc, чтобы переменная сохранялась
echo 'export ANSIBLE_VAULT_PASSWORD_FILE=~/.ansible_vault_pass' >> ~/.bashrc
```

### 4.5 Скажи Ansible использовать твой SSH-ключ

```bash
echo 'export ANSIBLE_PRIVATE_KEY_FILE=~/.ssh/nextalk_deploy' >> ~/.bashrc
source ~/.bashrc
```

### 4.6 Финальный pre-flight тест ansible

```bash
cd infra/ansible
ansible all -i inventory/hosts.ini -m ping
```
**Ожидаемо:** 8 раз `"ping": "pong"`.
**Если падает на каком-то хосте:** проверь Шаг 1.2 (ключ на этой VPS) и Шаг 1.4 (приватная сеть).

---

## Шаг 5. Прогон Ansible-playbook'ов

Все команды — из `infra/ansible/`.

> **Совет:** делай playbook'и **по одному** (не `site.yml` всё разом). При первом деплое каждый — проверочная точка. Дальше уже можно `site.yml`.

### 5.1 bootstrap — пакеты, sysctl, ufw, ssh_keys на 8 нодах

```bash
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml
```
**Время:** 3-5 мин.
**Что делает:** swapoff, sysctl `br_netfilter` + `ip_forward`, базовые пакеты (curl, jq, htop), ufw allow по [deployment.md §6.3](deployment.md#63-firewall-ufw), раскатка ключей через роль [ssh_keys](../infra/ansible/roles/ssh_keys), fail2ban на bastion.

**Проверка после:**
```bash
ansible all -i inventory/hosts.ini -m shell -a 'swapon --show'   # пусто на всех
ansible all -i inventory/hosts.ini -m shell -a 'ufw status | head -5'   # active
```

**Частые проблемы:**
- `Failed to lock apt`: на VPS уже идёт apt update — подожди, перезапусти.
- `Could not import python module: jinja2`: Ansible на хосте через pip → лучше через `sudo apt install ansible`.

### 5.2 db — PostgreSQL 18 + Redis на db-vps

```bash
ansible-playbook -i inventory/hosts.ini playbooks/db.yml
```
**Время:** 5-7 мин.
**Что делает:** `apt install postgresql-18 redis`, создаёт user `nextalk_app` + БД `nextalk` и `zitadel` (см. [group_vars/db.yml:15-23](../infra/ansible/inventory/group_vars/db.yml#L15-L23)), bind на private IP `10.19.0.31`, `pg_hba.conf` whitelist `10.19.0.21-23`, Redis с `requirepass` и `maxmemory 512mb`.

**Проверка после (с локалки через bastion):**
```bash
# psql клиент для проверки
sudo apt install -y postgresql-client redis-tools

# Достаём пароли из vault для проверки
PG_PASS=$(ansible-vault view inventory/group_vars/vault.yml | grep vault_postgres_password | cut -d'"' -f2)
REDIS_PASS=$(ansible-vault view inventory/group_vars/vault.yml | grep vault_redis_password | cut -d'"' -f2)

# Через bastion (10.19.0.31 в приватной сети)
ssh -J root@nextalk-bastion root@10.19.0.21 \
  "PGPASSWORD='$PG_PASS' psql -h 10.19.0.31 -U nextalk_app -d nextalk -c '\\l'"
# Должны быть видны базы nextalk и zitadel

ssh -J root@nextalk-bastion root@10.19.0.21 \
  "redis-cli -h 10.19.0.31 -a '$REDIS_PASS' ping"
# PONG
```

### 5.3 observability — Tempo + Loki + Prometheus + Grafana на obs-vps

```bash
ansible-playbook -i inventory/hosts.ini playbooks/observability.yml
```
**Время:** 5-10 мин (зависит от docker pull).
**Что делает:** ставит docker, копирует [infra/observability/](../infra/observability/) на obs-vps, рендерит [docker-compose.yaml.j2](../infra/ansible/roles/observability/templates/docker-compose.yaml.j2), поднимает 4 контейнера.

**Проверка:**
```bash
ssh nextalk-obs 'docker ps'
# 4 контейнера Running: prometheus, loki, tempo, grafana

ssh -J root@nextalk-bastion root@10.19.0.21 'curl -s http://10.19.0.41:9090/-/healthy'
# Prometheus Server is Healthy.

ssh -J root@nextalk-bastion root@10.19.0.21 'curl -s http://10.19.0.41:3100/ready'
# ready
```

### 5.4 k3s — HA control-plane + workers + kubeconfig

```bash
ansible-playbook -i inventory/hosts.ini playbooks/k3s.yml
```
**Время:** 8-12 мин.
**Что делает:**
1. Кладёт kube-vip DaemonSet manifests на 3 control-plane ноды.
2. `serial: 1` — ставит k3s на control-plane-1 c `--cluster-init`, ждёт VIP, потом control-plane-2 → control-plane-3 через VIP `https://10.19.0.10:6443`.
3. Ставит k3s agent на 3 worker'ах.
4. **Скачивает kubeconfig с control-plane-1**, заменяет `127.0.0.1` → `10.19.0.10` (VIP), кладёт в `infra/ansible/kubeconfig` (gitignored).

**Проверка с control-plane (через bastion):**
```bash
ssh -J root@nextalk-bastion root@10.19.0.11 'kubectl get nodes'
# 6 нод Ready: 3 control-plane с ролями control-plane,etcd,master; 3 worker
```

**Проверка с локалки (kubeconfig у тебя есть, но 10.19.0.10 недостижим):**
SSH-tunnel:
```bash
# В отдельном терминале
ssh -L 6443:10.19.0.10:6443 -N nextalk-control-plane-1

# В основном терминале
export KUBECONFIG=$PWD/kubeconfig
# Подправь server: в kubeconfig на https://127.0.0.1:6443 и добавь insecure-skip-tls-verify
sed -i 's|server: https://10.19.0.10:6443|server: https://127.0.0.1:6443|' kubeconfig
kubectl --insecure-skip-tls-verify get nodes
```
(Это разовая боль — см. [decisions.md → "Достижимость k3s API с CI-runner"](decisions.md).)

**Частые проблемы:**
- `wait_for: VIP timeout`: kube-vip не поднялся. На control-plane-1: `journalctl -u k3s | grep kube-vip`. Обычно — `private_iface` в [group_vars/all.yml:28](../infra/ansible/inventory/group_vars/all.yml#L28) не совпадает с реальным (см. Шаг 1.5).
- `control-plane-2 не присоединяется`: `vault_k3s_token` различается между прогонами или control-plane-1 не отдаёт `/var/lib/rancher/k3s/server/token`. Откатить: `ssh control-plane-N '/usr/local/bin/k3s-uninstall.sh'` и заново.

### 5.5 cluster-addons — ingress-nginx + cert-manager

Запускается с локалки (`hosts: localhost`), требует kubeconfig из 5.4. Если у тебя SSH-tunnel из 5.4 — оставь его открытым; иначе временно подними:
```bash
ssh -L 6443:10.19.0.10:6443 -N nextalk-control-plane-1 &
TUNNEL_PID=$!
# Подправь kubeconfig как в 5.4
```

```bash
ansible-playbook -i inventory/hosts.ini playbooks/cluster-addons.yml
```
**Время:** 3-5 мин.

**Проверка:**
```bash
kubectl get pods -n ingress-nginx
# DaemonSet, 3 пода Running на worker'ах
kubectl get pods -n cert-manager
# 3 пода Running: controller, webhook, cainjector
kubectl get crd | grep cert-manager
# 6+ CRD

# Снаружи (с любого устройства)
curl -I http://<любой-worker-public-ip>
# HTTP/1.1 404 Not Found, Server: nginx — это ОК
```

---

## Шаг 6. Helm deploy NexTalk

### 6.1 Сначала переключи на staging-issuer (защита от LE rate-limit)

Открой [charts/nextalk/values.yaml:37](../charts/nextalk/values.yaml#L37), временно поменяй:
```yaml
tls:
  issuer: "letsencrypt-staging"  # было: letsencrypt-prod
```
LE prod даёт **5 сертификатов в неделю на домен** — если HTTP-01 не пройдёт несколько раз, ты заблокирован на неделю.

### 6.2 Запуск helm-deploy

```bash
ansible-playbook -i inventory/hosts.ini playbooks/helm-deploy.yml \
  -e image_tag=0.1.0
```
**Время:** 5-10 мин (atomic + wait, до 10 мин).
**Что делает:** рендерит [helm-secrets.values.yaml.j2](../infra/ansible/playbooks/templates/helm-secrets.values.yaml.j2) во временный `.helm-secrets.values.yaml` (gitignored), запускает `helm upgrade --install nextalk` с values.yaml + secrets файлом, `--set image.tag=0.1.0` для 5 сервисов.

**Проверка сразу:**
```bash
kubectl get pods -n nextalk
# Все Running:
#   guildService x2, messagingService x2, voiceService x2,
#   websocketGateway x2, webSpa x2, zitadel x1, livekit x1, prometheus x1
#   alloy — DaemonSet, по поду на каждую из 6 нод k3s

kubectl get certificate -n nextalk
# nextalk-tls и auth-nextalk-tls — READY=True (ждать 1-3 мин на ACME)

kubectl get ingress -n nextalk
# 3-4 ingress объекта
```

**Частые проблемы:**
- `ImagePullBackOff`: образ не публичный или не существует — Шаг 3.4 / 3.5.
- `CrashLoopBackOff zitadel`: `kubectl logs -n nextalk deploy/zitadel` → `masterkey must be 32 bytes` → vault.yml в 4.2.
- `CrashLoopBackOff messagingService`: connection refused 10.19.0.31:5432 → Шаг 5.2 (db.yml не прогнан или pg_hba whitelist неверный).
- `Certificate not Ready 5+ мин`: `kubectl describe certificate nextalk-tls -n nextalk` → ищи `dnsName != hostname` или `HTTP-01 timeout`. DNS не пропагирован (Шаг 2) или ingress-nginx недоступен извне (`curl http://<worker-ip>/.well-known/acme-challenge/test`).

### 6.3 Smoke staging-сертификата

```bash
curl -kI https://nextalk.fun   # -k т.к. staging untrusted
# HTTP/2 200 (или 301 на /login)
```
**Если 200/301 с самоподписанным сертификатом** — HTTP-01 работает. Переходим к prod.

### 6.4 Переключи на prod-issuer

В [values.yaml:37](../charts/nextalk/values.yaml#L37):
```yaml
tls:
  issuer: "letsencrypt-prod"
```

```bash
# Удали старые Certificate-объекты, чтобы cert-manager выпустил заново
kubectl delete certificate nextalk-tls auth-nextalk-tls -n nextalk
kubectl delete secret nextalk-tls auth-nextalk-tls -n nextalk

# Reapply
ansible-playbook -i inventory/hosts.ini playbooks/helm-deploy.yml -e image_tag=0.1.0
```

**Проверка:**
```bash
kubectl get certificate -n nextalk
# READY=True для обоих, REASON=Ready, и в Secret будет настоящий LE-серт

curl -I https://nextalk.fun
# HTTP/2 200, валидный TLS (без -k!)
```

---

## Шаг 7. Smoke-тесты

### 7.1 Главный домен

```bash
curl -I https://nextalk.fun
# HTTP/2 200 от webSpa
```

### 7.2 Zitadel OIDC discovery

```bash
curl -s https://auth.nextalk.fun/.well-known/openid-configuration | jq .issuer
# "https://auth.nextalk.fun"
```
**Если issuer содержит `:443` или `http://`** — Zitadel сконфигурирован неверно. См. [decisions.md → ":port в Zitadel URL'ах"](decisions.md).

### 7.3 Логин в браузере

Открой `https://nextalk.fun` → редирект на `https://auth.nextalk.fun` → залогинься (для первого логина — дефолтные креды Zitadel в логе пода при первом старте: `kubectl logs -n nextalk deploy/zitadel | grep -i password`) → возврат на фронт.

### 7.4 Логи и метрики идут

С локалки (через SSH-tunnel либо ssh nextalk-obs):
- Открой Grafana: `ssh -L 3000:10.19.0.41:3000 -N nextalk-bastion` → http://localhost:3000 (admin/admin, поменять)
- В Grafana → Explore → Datasource Loki → query `{namespace="nextalk"}` → видны логи всех подов
- Datasource Prometheus → query `up{namespace="nextalk"}` → видны targets
- Datasource Tempo → search by service name → видны трассы

---

## Шаг 8. После деплоя

### 8.1 Сделай git tag и закоммить deploy-state

```bash
git tag v0.1.0
git push origin v0.1.0
```

### 8.2 Зафиксируй runbook-замечания

Если что-то пошло не как описано — обнови этот файл и [decisions.md](decisions.md). Сэкономишь себе и следующему деплою час.

### 8.3 Что включить в backlog

Reference: [decisions.md → "Отложено"](decisions.md). Высокоприоритетное после первого деплоя:
- **pg_dump cron** на db-vps (RPO сейчас = с момента последнего ручного бэкапа)
- **Disk-alerts** в Prometheus на db-vps и obs-vps (см. [deployment.md §11.9-11.10](deployment.md#119-disk-pressure-на-db-vps))
- **Решение по CI**: helm CLI install + способ достижения k3s API (4 варианта в decisions.md)

---

## Если всё пошло не так — куда смотреть

| Симптом | Куда |
|:--|:--|
| `ping`/SSH не работает | Шаг 1.4 (private network), Beget panel |
| ansible-playbook ругается на vault | `ANSIBLE_VAULT_PASSWORD_FILE` (Шаг 4.4) или `ansible-vault view ...` |
| k3s упал на VIP | Шаг 1.5 (`private_iface`), `journalctl -u k3s` на control-plane ноде |
| HTTP-01 challenge не проходит | DNS (Шаг 2), `kubectl describe challenge -A` |
| Под падает с DB error | Шаг 5.2, pg_hba whitelist, vault_postgres_password |
| Zitadel masterkey error | Шаг 4.2 проверка длины 32 |
| 502 на https | `kubectl get endpoints -n nextalk` — пустые? значит селектор Service не совпал с лейблами подов |

Для каждого нового бага — открой `kubectl describe` затронутого ресурса, потом `kubectl logs`. 90% инцидентов оттуда читаются.
