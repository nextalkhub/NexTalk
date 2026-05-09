# Kubernetes (k3s) Raw Manifests

> **Набор сырых K8s-манифестов для ознакомления.** Реальный деплой осуществляется через Helm-чарт: [`charts/nextalk/`](../charts/nextalk/).
> 
> Эти манифесты показывают структуру каждого ресурса (Deployment, Service, ConfigMap) и применяются командой `kubectl apply -f k8s/`. Для production-деплоя используется Helm:
> ```bash
> helm install nextalk charts/nextalk/ --namespace nextalk --create-namespace
> ```

## Требования

| Инструмент | Версия |
|:--|:--|
| k3s | v1.30+ |
| kubectl | v1.30+ |
| Docker | 25+ |

---

## Шаг 1 - Установка k3s (без Traefik)

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
```

Проверка:
```bash
sudo kubectl get nodes
```

Для работы без `sudo` нужно скопировать kubeconfig:
```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

---

## Шаг 2 - Nginx Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.0/deploy/static/provider/cloud/deploy.yaml
```

Дождись готовности:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

---

## Шаг 3 - Сборка и загрузка образов

Сборка образов и импорт в k3s (без отдельного registry):
```bash
docker build -t nextalk/guild-service:latest      ./src/guild-service
docker build -t nextalk/messaging-service:latest  ./src/messaging-service
docker build -t nextalk/voice-service:latest      ./src/voice-service
docker build -t nextalk/websocket-gateway:latest  ./src/websocket-gateway

# Импорт в containerd k3s
for svc in guild-service messaging-service voice-service websocket-gateway; do
  docker save nextalk/$svc:latest | sudo k3s ctr images import -
done
```

> Альтернатива: запушить в Docker Hub и убрать `imagePullPolicy: IfNotPresent` из манифестов.

---

## Шаг 4 - Конфигурация окружения

Изменить `k8s/01-configmap.yaml` - задать внешний адрес узла:
```yaml
data:
  ZITADEL_DOMAIN: "192.168.1.100"   # IP или hostname k3s-узла
  ZITADEL_EXTERNALPORT: "80"        # порт Nginx Ingress (по умолчанию 80)
```

Отредактировать `k8s/01-secrets.yaml` - заменить дев-значения на продакшн:
```yaml
stringData:
  postgres-password: "<strong-password>"
  zitadel-masterkey: "<exactly-32-characters>"
```

---

## Шаг 5 - Деплой

```bash
kubectl apply -f k8s/
```

Статус подов:
```bash
kubectl get pods -n nextalk -w
```

Все поды должны перейти в `Running` / `Ready`. PostgreSQL и Zitadel стартуют дольше (~60-90 сек).

---

## Шаг 6 - Проверка

### Health checks
```bash
for port in 5001 5002 5003 5004; do
  kubectl exec -n nextalk deploy/guild-service -- curl -s http://localhost:$port/healthz 2>/dev/null || true
done

# Через Ingress (из хост-системы)
curl http://localhost/api/guilds/health
curl http://localhost/.well-known/openid-configuration
```

### Grafana
Открыть в браузере: `http://<ZITADEL_DOMAIN>/monitoring/grafana`  
Логин: `admin` / `admin` (из secrets)

### Prometheus
```bash
kubectl port-forward -n nextalk svc/prometheus 9090:9090
```
Открой: `http://localhost:9090`

---

## Переменные окружения

| Переменная | Источник | Описание |
|:--|:--|:--|
| `ZITADEL_DOMAIN` | ConfigMap `nextalk-config` | Внешний hostname/IP для OIDC redirect |
| `ZITADEL_EXTERNALPORT` | ConfigMap `nextalk-config` | Порт Nginx Ingress (обычно `80`) |
| `ZITADEL_PUBLIC_SCHEME` | ConfigMap `nextalk-config` | `http` или `https` |
| `postgres-password` | Secret `nextalk-secrets` | Пароль PostgreSQL |
| `postgres-dsn-nextalk` | Secret `nextalk-secrets` | Npgsql DSN для .NET-сервисов |
| `postgres-dsn-zitadel` | Secret `nextalk-secrets` | libpq DSN для Zitadel |
| `livekit-api-key` | Secret `nextalk-secrets` | LiveKit API ключ |
| `livekit-secret-key` | Secret `nextalk-secrets` | LiveKit Secret ключ |
| `zitadel-masterkey` | Secret `nextalk-secrets` | Мастер-ключ Zitadel (ровно 32 символа) |
| `grafana-admin-password` | Secret `nextalk-secrets` | Пароль Grafana admin |

---

## Структура k8s/

| Файл | Содержимое |
|:--|:--|
| `00-namespace.yaml` | Namespace `nextalk` |
| `01-configmap.yaml` | Несекретная конфигурация (домен, порты) |
| `01-secrets.yaml` | Секреты (пароли, ключи) |
| `02-postgres.yaml` | PostgreSQL StatefulSet + PVC + Service |
| `03-redis.yaml` | Redis Deployment + Service |
| `04-livekit.yaml` | LiveKit ConfigMap + Deployment + Service |
| `05-zitadel.yaml` | Zitadel StatefulSet (api + login) + Service |
| `06-guild-service.yaml` | Guild Service Deployment (replicas: 2) + Service |
| `07-messaging-service.yaml` | Messaging Service Deployment + Service |
| `08-voice-service.yaml` | Voice Service Deployment + Service |
| `09-websocket-gateway.yaml` | WebSocket Gateway Deployment + Service |
| `10-prometheus.yaml` | Prometheus ConfigMap + PVC + Deployment + Service |
| `11-grafana.yaml` | Grafana ConfigMap + PVC + Deployment + Service |
| `12-ingress.yaml` | Nginx Ingress (все маршруты) |

---

## Удаление

```bash
kubectl delete namespace nextalk
```

> Это удалит все ресурсы включая PersistentVolumeClaims. Данные PostgreSQL и Grafana будут потеряны.
