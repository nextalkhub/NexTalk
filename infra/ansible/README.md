# NexTalk - Ansible deployment

Разворачивает NexTalk на 9 VPS (k3s HA + Postgres + Redis + observability) с нуля.

См. также [docs/deployment.md](../../docs/deployment.md) - там общая архитектура и обоснование решений.

## Состав

```
infra/ansible/
├── ansible.cfg
├── requirements.yml          # Galaxy collections
├── Makefile                  # make deploy / make db / ...
├── inventory/
│   ├── hosts.ini.example     # шаблон, копировать в hosts.ini
│   └── group_vars/
│       ├── all.yml           # общие переменные (VIP, CIDR, версии)
│       ├── bastion.yml       # override для bastion (без ProxyJump)
│       ├── control_plane.yml # ufw rules для control-plane нод
│       ├── workers.yml       # ufw rules для воркеров (открытые 80/443)
│       ├── k3s_cluster.yml   # k3s_token, disable list
│       ├── db.yml            # postgres/redis настройки + whitelist
│       ├── observability.yml # retention для observability-стека
│       └── vault.yml.example # секреты (скопировать → encrypt)
├── playbooks/
│   ├── site.yml              # полный оркестратор
│   ├── bootstrap.yml         # пакеты + sysctl + ufw на всех хостах
│   ├── gre-nat.yml           # GRE-туннели + NAT (obs/db → интернет)
│   ├── haproxy.yml           # HAProxy балансировщик k3s API (10.19.0.51)
│   ├── db.yml                # postgres + redis на db-vps
│   ├── observability.yml     # observability stack на observability-vps
│   ├── k3s.yml               # k3s HA (3 CP + 3 workers)
│   ├── cluster-addons.yml    # ingress-nginx + cert-manager + metrics-server
│   ├── argocd.yml            # ArgoCD + sealed-secrets + регистрация приложения (GitOps)
│   └── seal-secrets.yml      # запечатать секреты vault → argocd/sealed/
├── roles/
│   ├── common/               # пакеты, sysctl, swap, time
│   ├── ufw/                  # файрвол (правила из group_vars)
│   ├── ssh_keys/             # раскатка authorized_keys + fail2ban
│   ├── gre_nat/              # GRE-туннели + MASQUERADE на worker-1
│   ├── haproxy/              # HAProxy на отдельной VPS
│   ├── postgres/             # PG18 + conf + pg_hba + users + DB
│   ├── redis/                # Redis + conf
│   ├── docker/               # Docker CE + compose plugin
│   ├── k3s_server/           # control-plane
│   ├── k3s_agent/            # workers
│   ├── k6/                   # установка k6 для нагрузочных тестов
│   └── observability/        # docker-compose стек
└── scripts/
    └── smoke-test.sh
```

## Первый запуск (с нуля)

```bash
# 1. Установить ansible на локалке (Linux/macOS/WSL)
pip install ansible

# 2. Поставить collections
make galaxy

# 3. Скопировать шаблоны и заполнить
cp inventory/hosts.ini.example inventory/hosts.ini
cp inventory/group_vars/vault.yml.example inventory/group_vars/vault.yml
# - hosts.ini: подставить private IP и public_ip воркеров
# - vault.yml: openssl rand -hex 32 для k3s_token, openssl rand -base64 24 для паролей

# 4. Зашифровать секреты
ansible-vault encrypt inventory/group_vars/vault.yml

# 5. Проверить SSH
make ping

# 6. Развернуть все
make deploy
```

## По шагам (при отладке)

```bash
make bootstrap   # пакеты + sysctl + ufw
ansible-playbook -i inventory/hosts.ini playbooks/gre-nat.yml   # GRE-туннели + NAT
ansible-playbook -i inventory/hosts.ini playbooks/haproxy.yml   # HAProxy балансировщик
make db          # postgres + redis
make observability  # prometheus + loki + tempo + grafana
make k3s         # k3s HA
make addons      # ingress-nginx + cert-manager
make argocd      # ArgoCD + sealed-secrets, регистрация приложения (GitOps)
make seal        # запечатать секреты vault → argocd/sealed/ (затем git commit/push)
make smoke       # smoke-тесты
```

Приложение деплоит ArgoCD из git, не Ansible. После `make argocd` нужен
однократный `make seal` + commit секретов - см. [docs/gitops-argocd.md](../../docs/gitops-argocd.md).

## Vault: альтернатива --ask-vault-pass

Файл с паролем (не коммитить):

```bash
echo "mypassword" > ~/.ansible_vault_pass
chmod 600 ~/.ansible_vault_pass
export ANSIBLE_VAULT_PASSWORD_FILE=~/.ansible_vault_pass
```

## SSH через bastion

`worker-1` - единственный хост с публичным SSH. Все остальные ходят через него
автоматически (см. `ansible_ssh_common_args` в `group_vars/all.yml`).

## Ссылки

- [k3s installation docs](https://docs.k3s.io/installation/configuration)
- [k3s HA с embedded etcd](https://docs.k3s.io/datastore/ha-embedded)
- [Ansible docs](https://docs.ansible.com/)
