# NexTalk — Ansible orchestrator.
# Подразумевается, что hosts.ini и vault.yml уже заполнены.
#
# Использование:
#   make galaxy        # установить collections (один раз)
#   make ping          # проверить SSH до всех хостов
#   make bootstrap     # базовая настройка всех VPS
#   make db            # PostgreSQL + Redis
#   make obs           # observability stack
#   make k3s           # k3s HA + kube-vip
#   make addons        # ingress-nginx + cert-manager
#   make helm          # деплой приложений NexTalk
#   make deploy        # всё сразу (site.yml)
#   make smoke         # smoke-тесты после деплоя

INVENTORY    ?= inventory/hosts.ini
VAULT_PASS   ?= --ask-vault-pass
ANSIBLE      = ansible-playbook -i $(INVENTORY) $(VAULT_PASS)

.PHONY: galaxy ping bootstrap db obs k3s addons helm deploy smoke clean-kubeconfig

galaxy:
	ansible-galaxy collection install -r requirements.yml

ping:
	ansible -i $(INVENTORY) all -m ping

bootstrap:
	$(ANSIBLE) playbooks/bootstrap.yml

db:
	$(ANSIBLE) playbooks/db.yml

obs:
	$(ANSIBLE) playbooks/obs.yml

k3s:
	$(ANSIBLE) playbooks/k3s.yml

addons:
	ansible-playbook -i $(INVENTORY) playbooks/cluster-addons.yml

helm:
	ansible-playbook -i $(INVENTORY) playbooks/helm-deploy.yml

deploy:
	$(ANSIBLE) playbooks/site.yml

smoke:
	bash scripts/smoke-test.sh

clean-kubeconfig:
	rm -f kubeconfig
