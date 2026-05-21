# Security

Модель угроз и контроли NexTalk. Фиксируем что есть, что не закрыто, где осознанные компромиссы.

Связанные документы: [deployment.md](deployment.md).

## Модель угроз

**Атакующие:**
- Внешний сканер — массовый перебор 22 / 443 / 5432.
- Целевая атака на инфраструктуру через скомпрометированную зависимость или образ.
- Insider — подрядчик с доступом к репо.

**Активы (в порядке убывания критичности):**
1. PostgreSQL — переписки, аккаунты.
2. k3s etcd — секреты приложений, токены сервисов.
3. ansible-vault — пароли БД, k3s token.
4. VoIP-трафик — приватные звонки.
5. DNS-записи `nextalk.fun` — точка перехвата.

## Контроли

### Сеть
- `ufw` deny-by-default. Открыто:
  - 22 — только на bastion (worker-1).
  - 80/443 — на воркерах (ingress-nginx).
  - 6443 / 2379-2380 / 10250 — на master'ах из `10.19.0.0/16`.
  - 5432 / 6379 — на db только из `10.19.0.0/16`.
- PostgreSQL и Redis bind на private IP.
- k3s apiserver недоступен из интернета (мастера без public IP).

### SSH
- Bastion-only через ProxyJump. 7 из 8 серверов не имеют SSH-порта в интернете.
- ⚠ Парольный root-вход временно разрешён (упрощает первый bootstrap). После успешного деплоя — отключить: `PermitRootLogin prohibit-password`, `PasswordAuthentication no`, добавить fail2ban.

### Аутентификация в БД
- PostgreSQL: `scram-sha-256`, `pg_hba` whitelist по IP воркеров.
- Redis: `requirepass` из ansible-vault.

### Секреты
- ansible-vault для паролей и k3s token на стороне деплоя.
- k3s `secrets-encryption: true` — Secret-ы шифруются в etcd at-rest.
- ⚠ В подах секреты подкатываются через `env` (видны в `kubectl describe pod`). Следующая итерация — ExternalSecrets или volume mount.

### Изоляция подов
- PodSecurity admission: `enforce: baseline`, `warn: restricted` по дефолту.
- Exemption-ы: `kube-system`, `ingress-nginx`, `cert-manager`, `kube-public`, `kube-node-lease`.
- ⚠ NetworkPolicy default-deny НЕ настроены. Любой под ходит к любому. Следующая итерация.

### Образы контейнеров
- observability-стек — все версии запиннены в `roles/observability/defaults/main.yml`.
- Сервисы NexTalk — версии в `charts/nextalk/values.yaml` (контроль CI).
- ⚠ Image scanning (trivy) не настроен.

### Обновления
- `unattended-upgrades` включён на всех нодах, security-канал, ежедневно.
- k3s / kube-vip / Helm-чарт обновляются вручную через Ansible (новая итерация playbook'а).

### TLS
- cert-manager + Let's Encrypt (HTTP-01) — авто-выпуск и ротация.
- Внутри кластера flannel шифрования не делает — трафик между подами в открытом виде. Принято осознанно: mTLS / service mesh — overhead под 2 vCPU/4 GB.

### Audit
- ⚠ k3s audit log отключён. Без него инцидент через apiserver не разобрать. Следующая итерация — включить `audit-log-path`.

### Бэкап
- ⚠ etcd snapshot не настроен. Потеря всех 3 master'ов = безвозвратная потеря состояния кластера. План: `k3s etcd-snapshot save` по cron + offload в S3-совместимое хранилище.

## Roadmap (порядок снижения риска)

1. NetworkPolicy default-deny на namespace `nextalk`.
2. SSH ключи-only + fail2ban на bastion.
3. etcd snapshot backup + offload.
4. ExternalSecrets / SealedSecrets вместо env.
5. k3s audit log + парсинг в Loki.
6. Image scanning в CI (trivy).
7. mTLS между сервисами — когда вырастет нагрузка и появится бюджет на ресурсы.

## Ссылки

- [k3s secrets encryption](https://docs.k3s.io/security/secrets-encryption)
- [PodSecurity admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [unattended-upgrades](https://wiki.debian.org/UnattendedUpgrades)
- [OWASP — Kubernetes security cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html)
