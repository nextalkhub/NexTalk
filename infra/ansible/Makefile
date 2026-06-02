INVENTORY    ?= inventory/hosts.ini
VAULT_PASS   ?= --ask-vault-pass
ANSIBLE      = ansible-playbook -i $(INVENTORY) $(VAULT_PASS)

.DEFAULT_GOAL := help

.PHONY: help galaxy ping bootstrap ssh gre-nat haproxy db observability k3s addons argocd seal deploy smoke clean-kubeconfig

help: ## Показать эту справку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

galaxy: ## Установить Ansible collections (один раз)
	ansible-galaxy collection install -r requirements.yml

ping: ## Проверить SSH до всех хостов
	ansible -i $(INVENTORY) all -m ping

bootstrap: ## Базовая настройка всех VPS
	$(ANSIBLE) playbooks/bootstrap.yml

ssh: ## Раскатать SSH-ключи (без полного bootstrap)
	$(ANSIBLE) playbooks/bootstrap.yml --tags ssh_keys

gre-nat: ## GRE-туннели + NAT (obs/db → интернет)
	$(ANSIBLE) playbooks/gre-nat.yml

haproxy: ## HAProxy балансировщик k3s API
	$(ANSIBLE) playbooks/haproxy.yml

db: ## PostgreSQL + Redis
	$(ANSIBLE) playbooks/db.yml

observability: ## Observability stack (Prometheus, Loki, Tempo, Grafana)
	$(ANSIBLE) playbooks/observability.yml

k3s: ## k3s HA кластер (3 CP + 3 workers)
	$(ANSIBLE) playbooks/k3s.yml

addons: ## ingress-nginx + cert-manager
	ansible-playbook -i $(INVENTORY) playbooks/cluster-addons.yml

argocd: ## ArgoCD + sealed-secrets, регистрация приложения (GitOps)
	ansible-playbook -i $(INVENTORY) playbooks/argocd.yml

seal: ## Запечатать секреты vault -> argocd/sealed/nextalk-secrets.yaml
	$(ANSIBLE) playbooks/seal-secrets.yml

deploy: ## Всё сразу (site.yml)
	$(ANSIBLE) playbooks/site.yml

smoke: ## Smoke-тесты после деплоя
	bash scripts/smoke-test.sh

clean-kubeconfig: ## Удалить локальный kubeconfig
	rm -f kubeconfig
