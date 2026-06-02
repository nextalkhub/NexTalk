# charts/nextalk - Helm-чарт NexTalk

Деплоит NexTalk в k3s HA кластер. Постгрес, Redis и observability - вне чарта (на отдельных VPS, см. [docs/deployment.md](../../docs/deployment.md)).

## Состав

| Файл | Содержимое |
|:--|:--|
| `Chart.yaml` | Метаданные чарта |
| `values.yaml` | Дефолты. Секреты подкатываются через `-f vault-rendered.yaml` |
| `templates/namespace.yaml` | Namespace `nextalk` |
| `templates/configmap.yaml` | Несекретная конфигурация Zitadel и .NET |
| `templates/secrets.yaml` | Secret `nextalk-secrets`: пароли, DSN, masterkey, LiveKit ключи |
| `templates/clusterissuer.yaml` | cert-manager ClusterIssuer (Let's Encrypt staging + prod) |
| `templates/ingress.yaml` | Nginx Ingress: маршруты API, Zitadel OIDC, web-spa |
| `templates/livekit.yaml` | LiveKit SFU (single-node, hostPort для UDP RTC) |
| `templates/zitadel.yaml` | Zitadel StatefulSet (api + login UI), 1 реплика |
| `templates/kube-state-metrics.yaml` | kube-state-metrics v2.13.0 (метрики deployments/pods/HPA/nodes) |
| `templates/guild-service.yaml` | Guild Service |
| `templates/messaging-service.yaml` | Messaging Service |
| `templates/voice-service.yaml` | Voice Service |
| `templates/websocket-gateway.yaml` | WebSocket Gateway |
| `templates/web-spa.yaml` | Web SPA (nginx static) |
| `templates/prometheus.yaml` | In-cluster Prometheus c remote_write на obs-vps |
| `templates/alloy.yaml` | Alloy DaemonSet (логи → Loki) |
| `templates/hpa.yaml` | HPA для stateless-сервисов |
| `templates/pdb.yaml` | PodDisruptionBudget на каждый сервис |
| `templates/networkpolicy.yaml` | Default-deny + allow-list |

## Безопасность

- Все секреты - только через `required`-валидацию: `helm install` упадет, если значение пустое.
- Все поды non-root (`runAsNonRoot: true`).
- `drop: ALL` capabilities, `allowPrivilegeEscalation: false`.
- NetworkPolicy default-deny с явным allow-list для DNS / ingress-nginx / db-vps / obs-vps.
- PSA `baseline` enforce (см. infra/ansible/roles/k3s_server/templates/psa.yaml.j2).
- Образы - фиксированные теги, `:latest` запрещен.

См. [docs/security.md](../../docs/deployment.md) для общей модели угроз.

## Деплой

Чарт разворачивает ArgoCD по GitOps - вручную `helm upgrade` в прод не делаем.
Bootstrap (из `infra/ansible`):

```bash
make argocd   # ArgoCD + sealed-secrets + регистрация Application
make seal     # секреты vault -> argocd/sealed/nextalk-secrets.yaml -> git
```

Секреты не лежат в `values.yaml`: при `secrets.create=false` (дефолт) `templates/secrets.yaml`
не рендерится, а `Secret nextalk-secrets` приходит из SealedSecret. Полный разбор -
[docs/gitops-argocd.md](../../docs/gitops-argocd.md).

Локальный рендер для отладки:

```bash
helm template nextalk charts/nextalk            # GitOps-режим (без секрета)
helm template nextalk charts/nextalk -s templates/secrets.yaml --set secrets.create=true -f secret-values.yaml
```

## Что вне чарта

| Что | Где |
|:--|:--|
| PostgreSQL | db-vps, docker-compose (infra/db/docker-compose.db.yaml) |
| Redis | db-vps |
| Loki / Tempo / Grafana | observability-vps (infra/ansible/roles/observability) |
| Ingress-nginx + cert-manager | playbooks/cluster-addons.yml (через Helm) |
| HAProxy (HA apiserver endpoint) | infra/ansible/roles/haproxy (отдельная VPS 10.19.0.51) |
