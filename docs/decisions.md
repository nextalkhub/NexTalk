# Решения по проду и отложенные задачи

Сюда записываем что и почему отложили или решили делать именно так, а не иначе. Чтобы через полгода не вспоминать заново и не повторять обсуждение.

Связанные документы: [deployment.md](deployment.md), [security.md](security.md), [ssh-access.md](ssh-access.md).

## Отложено

| Тема | Решение | Причина | Когда вернуться |
|:--|:--|:--|:--|
| Swagger UI в кластере | Не выставлять через Ingress. Доступ через `kubectl port-forward svc/<service> <port>:<port> -n nextalk` локально | Лишний слой ConfigMap'ов + IP whitelist ради того, чем пользуется один человек раз в неделю | Когда захочется быстро шарить Swagger команде |
| Zitadel HA (2+ реплики) | 1 реплика, `start-from-init`, PVC под PAT | Bootstrap пишет PAT на локальный PVC и создаёт первую Organization в Postgres — двух реплик гонять одновременно нельзя. По докам Zitadel HA-схема: отдельные Job `zitadel init` + `zitadel setup` → Deployment `zitadel start` N реплик; PAT хранится в Secret и монтируется как файл в login UI | Когда упрёмся в окно даунтайма при апгрейде Zitadel |
| Zitadel PAT в Secret вместо PVC | PVC `bootstrap` 100Mi | PVC проще на 1 реплике, login sidecar читает файл из общего volume. В проде по докам PAT должен быть в Secret + mount как файл (`ZITADEL_SERVICE_USER_TOKEN_FILE`) — это позволит разнести api и login по разным подам | Перед переездом на HA |
| etcd snapshots на S3 | Локальные snapshots в `/var/lib/rancher/k3s/server/db/snapshots/` | S3 для бэкапа на старте — overhead. 8 VPS, embedded etcd на 3 control-plane нодах, потеря одной не критична | Когда появятся данные, потеря которых стоит дороже S3 |
| Аудит-лог k3s в Loki | Не включаем | Лишний шум на старте. В Loki и так пойдут логи приложений + ingress | Когда появится compliance-требование или security-инцидент |
| ExternalSecrets / Sealed Secrets | Секреты через `ansible-vault` + render на helm-deploy | Один отдельный слой управления секретами проще двух. Vault уже работает | Когда подключим ArgoCD (нужен механизм secrets-in-git) |
| ArgoCD | Скелет [argocd/](../argocd/) лежит, не подключаем | GitHub Actions + Ansible делают то же без extra-секретного слоя. ArgoCD имеет смысл при 2+ окружениях | Когда появится staging |
| TLS на Postgres (`sslmode=require`) | `sslmode=prefer` | Postgres в приватной сети Beget, TLS на нём ещё не настроен. `prefer` — TLS если сервер поддерживает, иначе plain | Когда выкатим cert-manager на db-vps |
| Trivy в CI: блокировать билд | `exit-code: 0` (информирует, не падает) | На старте корпус ignore'ов пуст — любая случайная CVE упадёт билд. Сначала набираем `.trivyignore` | Когда отчёты стабилизируются и появится приоритезация CVE |
| Zabbix | Не используем | Дублирует Prometheus + Loki + Jaeger, которые уже есть | Никогда (с большой вероятностью) |
| `helm` CLI на CI-runner | Не установлен в `.github/workflows/deploy.yml` | `kubernetes.core.helm` шеллит `helm` из PATH. На `ubuntu-latest` helm иногда предустановлен, но это нестабильное предположение. Фикс — `azure/setup-helm@v4` перед helm-deploy шагом | При первом запуске deploy.yml (если упадёт `helm: command not found`) |
| Достижимость k3s API с CI-runner | Не решена. Kubeconfig указывает на `10.19.0.50` (приватная Beget-сеть) — runner из публичного интернета туда не достучится | Варианты: A) SSH-tunnel через bastion; B) делегировать helm-task на control-plane через ProxyJump; C) self-hosted runner внутри Beget VPC | Перед первым реальным деплоем через GH Actions |

## Принято и сделано

| Тема | Решение | Почему |
|:--|:--|:--|
| `:port` в Zitadel URL'ах | Убран из BASEURI и `CUSTOM_REQUEST_HEADERS` | Был артефактом docker-compose (`:8080`). В проде с 443/80 порт опускается, иначе ломается issuer |
| Login UI Zitadel | Sidecar в том же поде, что и API | Чтобы login Next.js видел PAT файл через общий PVC. Так же в docker-compose |
| Образы | Все теги пин-нуты, `latest` запрещён конвенцией | `latest` ломает воспроизводимость деплоя. Сейчас не enforce'нуто `fail`-валидацией, но в values только конкретные версии |
| Ingress | Три объекта (`nextalk-api`, `nextalk-grpc-web`, `nextalk-main`) на одном хосте | Per-Ingress аннотации (rewrite, use-regex, proxy-buffering) конфликтуют. Ingress-nginx склеивает на одном хосте сам |
| WebSocket путь | `/hubs` (SignalR convention .NET) | Совпадает с infra/nginx/nginx.conf.template |
| ghcr.io visibility | Публичный репо | Privacy не нужна, образы публичные. Не надо `imagePullSecret` |
| Public IP на VPS | Только `worker-1` (bastion+SSH), `worker-2/3` (ingress 80/443) | Остальные 5 VPS — только приватная сеть Beget. Меньше attack surface |
| Vault | `ansible-vault` (встроен в ansible-core, AES256+PBKDF2) | Никакого отдельного сервиса. Одна команда на encrypt/decrypt |
| kube-vip → HAProxy | HAProxy на отдельной ноде (10.19.0.50) вместо kube-vip ARP mode | Beget hypervisor фильтрует gratuitous ARP: `arp -n 10.19.0.10` на cp-2 — `(incomplete)`, ping 100% loss. kube-vip ARP mode физически невозможен. HAProxy работает на L3, health-check TCP, не требует ARP |

## Ссылки

- [Zitadel self-hosting (ExternalDomain/Port/Secure)](https://zitadel.com/docs/self-hosting/manage/custom-domain)
- [ingress-nginx annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [k3s embedded etcd HA](https://docs.k3s.io/datastore/ha-embedded)
- [LiveKit ports & firewall](https://docs.livekit.io/realtime/self-hosting/ports-firewall/)
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action)
