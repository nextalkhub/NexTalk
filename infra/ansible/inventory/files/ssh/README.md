# Публичные SSH-ключи

Все `*.pub` отсюда раскатываются на `root@<host>:~/.ssh/authorized_keys` ролью `ssh_keys` (см. `infra/ansible/roles/ssh_keys/`).

## team/

Ключи разработчиков. Имя файла — псевдоним владельца.

```bash
# Положить свой ключ:
cp ~/.ssh/id_ed25519.pub infra/ansible/inventory/files/ssh/team/danil.pub
git add infra/ansible/inventory/files/ssh/team/danil.pub
git commit -m "ssh: add danil pubkey"
```

Удалить ключ — просто удалить файл и закоммитить. Ansible **не** убирает старые ключи автоматически (`exclusive: false`); для очистки сорванных ключей делать `authorized_key state: absent` отдельной таской.

## ci/

Deploy-ключи для CI/CD. По одному на пайплайн.

Генерация:

```bash
ssh-keygen -t ed25519 -f ./github-actions-deploy -N "" -C "github-actions-deploy@nextalk"
# Приватный ключ → GitHub Secrets (см. .github/workflows/deploy.yml)
cat github-actions-deploy | gh secret set ANSIBLE_SSH_PRIVATE_KEY --repo nextalkhub/NexTalk
# Публичный ключ → в этот каталог
mv github-actions-deploy.pub infra/ansible/inventory/files/ssh/ci/github-actions-deploy.pub
# Удалить локальный приватник:
rm github-actions-deploy
```

CI-ключи раскатываются с ограничениями (`no-port-forwarding,no-X11-forwarding,no-agent-forwarding`) — см. `roles/ssh_keys/tasks/main.yml`.
