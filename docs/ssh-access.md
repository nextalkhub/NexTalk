# SSH-доступ к инфраструктуре

Кто и как ходит на VPS NexTalk: разработчики, CI, оператор vault'а.

Связанные документы: [deployment.md](deployment.md), [security.md](security.md).

## Топология

```
интернет → bastion (worker-1, публичный IP) → ProxyJump → остальные 7 VPS
```

Только `worker-2`, `worker-3` имеют публичные IP (для ingress 80/443). У остальных публичный IPv4 отключён в панели Beget.

`worker-1` принимает SSH на 22, через него (`ProxyJump`) ходят и Ansible, и люди.

## Управление ключами

Все публичные ключи лежат в репо и раскатываются Ansible-ролью `ssh_keys` (`infra/ansible/roles/ssh_keys/`).

| Куда | Что |
|:--|:--|
| `infra/ansible/inventory/files/ssh/team/*.pub` | Ключи разработчиков |
| `infra/ansible/inventory/files/ssh/ci/*.pub` | Deploy-ключи GitHub Actions |

Раскатка:

```bash
cd infra/ansible
make bootstrap   # вызывает common + ufw + ssh_keys
# или точечно:
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --tags ssh_keys
```

## Добавить разработчика

```bash
cp ~/.ssh/id_ed25519.pub infra/ansible/inventory/files/ssh/team/<имя>.pub
git add infra/ansible/inventory/files/ssh/team/<имя>.pub
git commit -m "ssh: add <имя> pubkey"
# После merge в main:
cd infra/ansible && ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --tags ssh_keys
```

Разработчик после этого ходит так:

```bash
# ~/.ssh/config
Host nextalk-bastion
  HostName <public_ip_worker_1>
  User root
  IdentityFile ~/.ssh/id_ed25519

Host nextalk-*
  ProxyJump nextalk-bastion
  User root
  IdentityFile ~/.ssh/id_ed25519

Host nextalk-control-plane-1
  HostName 10.19.0.11
Host nextalk-db
  HostName 10.19.0.20
# и т.д.
```

```bash
ssh nextalk-bastion              # на воркер-1 напрямую
ssh nextalk-control-plane-1      # через ProxyJump
```

## Удалить разработчика

```bash
git rm infra/ansible/inventory/files/ssh/team/<имя>.pub
git commit -m "ssh: remove <имя> pubkey"
```

⚠ `authorized_key state: present, exclusive: false` — Ansible **не удаляет** старые записи. Для жёсткого удаления добавь отдельную таску с `state: absent` и точным значением ключа, либо переключи на `exclusive: true` (тогда любые ручные правки authorized_keys будут затёрты).

## CI/CD deploy-ключ

Один ключ для GitHub Actions, приватная часть в секретах репозитория.

Генерация:

```bash
ssh-keygen -t ed25519 -f ./github-actions-deploy -N "" -C "github-actions-deploy@nextalk"

# Приватный ключ → GitHub Secret ANSIBLE_SSH_PRIVATE_KEY
gh secret set ANSIBLE_SSH_PRIVATE_KEY --repo nextalkhub/NexTalk < github-actions-deploy

# Публичный ключ → в репо
mv github-actions-deploy.pub infra/ansible/inventory/files/ssh/ci/github-actions-deploy.pub
git add infra/ansible/inventory/files/ssh/ci/github-actions-deploy.pub
git commit -m "ssh: add CI deploy pubkey"

# Удалить локальную приватную часть
rm github-actions-deploy
```

Дополнительные secrets для `.github/workflows/deploy.yml`:

| Secret | Содержимое |
|:--|:--|
| `ANSIBLE_SSH_PRIVATE_KEY` | приватная часть deploy-ключа |
| `ANSIBLE_VAULT_PASSWORD` | пароль для ansible-vault (тот же, что у разработчиков локально) |
| `ANSIBLE_HOSTS_INI` | содержимое `inventory/hosts.ini` (реальные приватные IP) |
| `BASTION_HOST` | публичный IP/хостнейм bastion'а (для `ssh-keyscan`) |

CI-ключи раскатываются с ограничениями: `no-port-forwarding,no-X11-forwarding,no-agent-forwarding`. Если CI понадобится больше — править `roles/ssh_keys/tasks/main.yml`.

## Hardening (deferred)

После того как все разработчики подтвердят, что ходят по ключам:

```bash
# Включаем в playbooks/bootstrap.yml для bastion:
ssh_keys_disable_passwords: true
```

Что это включит на bastion:
- `PasswordAuthentication no`
- `PermitRootLogin prohibit-password`
- `KbdInteractiveAuthentication no`

⚠ Перед переключением — войти под ключом и убедиться, что работает. Иначе можно потерять доступ к bastion'у и придётся восстанавливать через консоль Beget.

`fail2ban` на bastion уже включён по умолчанию (`ssh_keys_install_fail2ban: true` в playbook).

## Ссылки

- [Ansible authorized_key module](https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html)
- [OpenSSH sshd_config](https://man.openbsd.org/sshd_config)
- [fail2ban](https://github.com/fail2ban/fail2ban)
