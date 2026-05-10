NAMESPACE   := nextalk
SERVICES    := guild-service messaging-service voice-service websocket-gateway
NODE_IP     ?= $(shell kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null)

.DEFAULT_GOAL := help

.PHONY: help wait status logs images import probe \
        helm-install helm-upgrade helm-uninstall teardown

help: ## Показать эту справку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Kubernetes ────────────────────────────────────────

wait: ## Дождаться, пока все pod'ы в namespace станут Ready
	kubectl wait --namespace $(NAMESPACE) \
	  --for=condition=ready pod --selector=app --timeout=300s

status: ## Показать статус pod'ов и сервисов
	kubectl get pods,svc -n $(NAMESPACE)

logs: ## Смотреть логи сервиса → make logs SERVICE=guild-service
	kubectl logs -n $(NAMESPACE) -l app=$(SERVICE) -f --tail=100

teardown: ## Удалить весь namespace (ОПАСНО!)
	kubectl delete namespace $(NAMESPACE)

# ── Helm ─────────────────────────────────────────────────────────────

helm-install: ## Установить через Helm (первый запуск)
	helm install nextalk charts/nextalk/ \
	  --namespace $(NAMESPACE) --create-namespace

helm-upgrade: ## Обновить существующий Helm релиз
	helm upgrade nextalk charts/nextalk/ --namespace $(NAMESPACE)

helm-uninstall: ## Удалить Helm релиз
	helm uninstall nextalk -n $(NAMESPACE)

# ── Сборка локальных образов и импорт в k3s ───────────────────────────

images: ## Собрать все Docker-образы локально
	$(foreach svc,$(SERVICES),docker build -t nextalk/$(svc):latest ./src/$(svc);)

import: images ## Собрать + импортировать образы в k3s containerd (без registry)
	$(foreach svc,$(SERVICES),docker save nextalk/$(svc):latest | sudo k3s ctr images import -;)

# ── Смоук-тест ───────────────────────────────────────────────────────

probe: ## Проверить endpoint Redis cache hit/miss (нужен NODE_IP или NODE_IP=x.x.x.x)
	@echo "--- запрос 1 (ожидается: источник=origin) ---"
	curl -s http://$(NODE_IP)/api/guilds/probe
	@echo ""
	@echo "--- запрос 2 (ожидается: источник=cache) ---"
	curl -s http://$(NODE_IP)/api/guilds/probe
	@echo ""