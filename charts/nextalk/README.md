# Kubernetes (k3s). Helm
## Структура

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