#!/usr/bin/env bash
# Запуск полного деплоя NexTalk в k3s.
# Требует: ansible, заполненный hosts.ini и vault.yml.
# Подробности: docs/runbook-deploy.md
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$REPO_ROOT/infra/ansible"
HOSTS="$ANSIBLE_DIR/inventory/hosts.ini"
VAULT="$ANSIBLE_DIR/inventory/group_vars/vault.yml"

# ── Pre-flight ────────────────────────────────────────────────────────────────

if ! command -v ansible-playbook &>/dev/null; then
    echo "Ansible не найден. Установи:"
    echo "  sudo apt install ansible              # Ubuntu/Debian"
    echo "  pip install ansible                   # pip"
    exit 1
fi

if [[ ! -f "$HOSTS" ]]; then
    echo "Не найден inventory/hosts.ini"
    echo "Создай его из примера:"
    echo "  cp $ANSIBLE_DIR/inventory/hosts.ini.example $HOSTS"
    echo "Затем вставь IP твоих нод (см. docs/runbook-deploy.md §4.1)"
    exit 1
fi

if [[ ! -f "$VAULT" ]]; then
    echo "Не найден vault.yml"
    echo "Создай его из примера:"
    echo "  cp $ANSIBLE_DIR/inventory/group_vars/vault.yml.example $VAULT"
    echo "Заполни REPLACE_ME значения, затем зашифруй:"
    echo "  ansible-vault encrypt $VAULT"
    echo "(см. docs/runbook-deploy.md §4.2)"
    exit 1
fi

# Проверяем что vault зашифрован, а не plain text
if head -1 "$VAULT" | grep -qv '^\$ANSIBLE_VAULT'; then
    echo "vault.yml не зашифрован - не запускаем деплой."
    echo "Зашифруй: ansible-vault encrypt $VAULT"
    exit 1
fi

# ── Deploy ────────────────────────────────────────────────────────────────────

echo "=== NexTalk deploy ==="
echo "  Inventory : $HOSTS"
echo "  Vault     : $VAULT (encrypted)"
echo ""

cd "$ANSIBLE_DIR"
ansible-playbook -i inventory/hosts.ini playbooks/site.yml "$@"
