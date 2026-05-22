# Решения по проду и отложенные задачи

Сюда записываем что и почему отложили или решили делать именно так, а не иначе. Чтобы через полгода не вспоминать заново и не повторять обсуждение.

Связанные документы: [deployment.md](deployment.md), [security.md](security.md), [ssh-access.md](ssh-access.md).

## Отложено

| Тема | Решение | Причина | Когда вернуться |
|:--|:--|:--|:--|
| Swagger UI в кластере | Не выставлять через Ingress. Доступ через `kubectl port-forward svc/<service> <port>:<port> -n nextalk` локально | Лишний слой ConfigMap'ов + IP whitelist ради того, чем пользуется один человек раз в неделю | Когда захочется быстро шарить Swagger команде |
| Zitadel HA (2+ реплики) | 1 реплика, `start-from-init`, PVC под PAT | Bootstrap пишет PAT на локальный PVC и создаёт первую Organization в Postgres — двух реплик гонять одновременно нельзя. HA требует разделить Job (init) и Deployment (start) + вынести PAT в Secret | Когда упрёмся в окно даунтайма при апгрейде Zitadel |
| etcd snapshots на S3 | Локальные snapshots в `/var/lib/rancher/k3s/server/db/snapshots/` | S3 для бэкапа на старте — overhead. 8 VPS, embedded etcd на 3 master'ах, потеря одного master'а не критична | Когда появятся данные, потеря которых стоит дороже S3 |
| Аудит-лог k3s в Loki | Не включаем | Лишний шум на старте. В Loki и так пойдут логи приложений + ingress | Когда появится compliance-требование или security-инцидент |
| ExternalSecrets / Sealed Secrets | Секреты через `ansible-vault` + render на helm-deploy | Один отдельный слой управления секретами проще двух. Vault уже работает | Когда подключим ArgoCD (нужен механизм secrets-in-git) |
| ArgoCD | Скелет [argocd/](../argocd/) лежит, не подключаем | GitHub Actions + Ansible делают то же без extra-секретного слоя. ArgoCD имеет смысл при 2+ окружениях | Когда появится staging |
| TLS на Postgres (`sslmode=require`) | `sslmode=prefer` | Postgres в приватной сети Beget, TLS на нём ещё не настроен. `prefer` — TLS если сервер поддерживает, иначе plain | Когда выкатим cert-manager на db-vps |
| Trivy в CI | Не подключаем | Польза реальная (CVE в base-образах и NuGet/npm deps), но на старте лишний шум + время билда. Подключим точечно на `push to main` | Когда базовые образы постареют на пару месяцев и появятся CRITICAL CVE |
| Zabbix | Не используем | Дублирует Prometheus + Loki + Jaeger, которые уже есть | Никогда (с большой вероятностью) |

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

## Ссылки

- [Zitadel self-hosting (ExternalDomain/Port/Secure)](https://zitadel.com/docs/self-hosting/manage/custom-domain)
- [ingress-nginx annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [k3s embedded etcd HA](https://docs.k3s.io/datastore/ha-embedded)
- [LiveKit ports & firewall](https://docs.livekit.io/realtime/self-hosting/ports-firewall/)
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action)
