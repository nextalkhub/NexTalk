# NexTalk - Ansible orchestrator.
# Подразумевается, что hosts.ini и vault.yml уже заполнены.
#
# Использование:
#   make galaxy        # установить collections (один раз)
#   make ping          # проверить SSH до всех хостов
#   make bootstrap     # базовая настройка всех VPS
#   make ssh           # раскатать SSH-ключи (без полного bootstrap)
#   make gre-nat       # GRE-туннели + NAT (obs/db → интернет)
#   make haproxy       # HAProxy балансировщик k3s API
#   make db            # PostgreSQL + Redis
#   make observability # observability stack
#   make k3s           # k3s HA
#   make addons        # ingress-nginx + cert-manager
#   make helm          # деплой приложений NexTalk
#   make deploy        # все сразу (site.yml)
#   make smoke         # smoke-тесты после деплоя

INVENTORY    ?= inventory/hosts.ini
VAULT_PASS   ?= --ask-vault-pass
ANSIBLE      = ansible-playbook -i $(INVENTORY) $(VAULT_PASS)

.PHONY: galaxy ping bootstrap ssh gre-nat haproxy db observability k3s addons helm deploy smoke clean-kubeconfig

galaxy:
	ansible-galaxy collection install -r requirements.yml

ping:
	ansible -i $(INVENTORY) all -m ping

bootstrap:
	$(ANSIBLE) playbooks/bootstrap.yml

ssh:
	$(ANSIBLE) playbooks/bootstrap.yml --tags ssh_keys

gre-nat:
	$(ANSIBLE) playbooks/gre-nat.yml

haproxy:
	$(ANSIBLE) playbooks/haproxy.yml

db:
	$(ANSIBLE) playbooks/db.yml

observability:
	$(ANSIBLE) playbooks/observability.yml

k3s:
	$(ANSIBLE) playbooks/k3s.yml

addons:
	ansible-playbook -i $(INVENTORY) playbooks/cluster-addons.yml

helm:
	$(ANSIBLE) playbooks/helm-deploy.yml

deploy:
	$(ANSIBLE) playbooks/site.yml

smoke:
	bash scripts/smoke-test.sh

clean-kubeconfig:
	rm -f kubeconfig
