# Решения по проду и отложенные задачи

Сюда записываем что и почему отложили или решили делать именно так, а не иначе. Чтобы через полгода не вспоминать заново и не повторять обсуждение.

Связанные документы: [deployment.md](deployment.md), [security.md](security.md), [ssh-access.md](ssh-access.md).

## Отложено

| Тема | Решение | Причина | Когда вернуться |
|:--|:--|:--|:--|
| Swagger UI в кластере | Не выставлять через Ingress. Доступ через `kubectl port-forward svc/<service> <port>:<port> -n nextalk` локально | Лишний слой ConfigMap'ов + IP whitelist ради того, чем пользуется один человек раз в неделю | Когда захочется быстро шарить Swagger команде |
| Zitadel HA (2+ реплики) | 1 реплика, `start-from-init`, PVC под PAT | Bootstrap пишет PAT на локальный PVC и создает первую Organization в Postgres - двух реплик гонять одновременно нельзя. По докам Zitadel HA-схема: отдельные Job `zitadel init` + `zitadel setup` → Deployment `zitadel start` N реплик; PAT хранится в Secret и монтируется как файл в login UI | Когда упремся в окно даунтайма при апгрейде Zitadel |
| Zitadel PAT в Secret вместо PVC | PVC `bootstrap` 100Mi | PVC проще на 1 реплике, login sidecar читает файл из общего volume. В проде по докам PAT должен быть в Secret + mount как файл (`ZITADEL_SERVICE_USER_TOKEN_FILE`) - это позволит разнести api и login по разным подам | Перед переездом на HA |
| Zitadel PAT race при пересоздании namespace | Если namespace удален (PVC тоже), но БД Zitadel цела - `start-from-init` не пишет PAT повторно (инстанс уже существует), login падает вечно. Фикс: дропнуть схему Zitadel в postgres: `psql zitadel -c "DROP SCHEMA zitadel CASCADE; CREATE SCHEMA zitadel;"` - после рестарта пода `start-from-init` запустится заново | Не откладывать - при каждом полном пересоздании namespace |
| etcd snapshots на S3 | Локальные snapshots в `/var/lib/rancher/k3s/server/db/snapshots/` | S3 для бэкапа на старте - overhead. 8 VPS, embedded etcd на 3 control-plane нодах, потеря одной не критична | Когда появятся данные, потеря которых стоит дороже S3 |
| Аудит-лог k3s в Loki | Не включаем | Лишний шум на старте. В Loki и так пойдут логи приложений + ingress | Когда появится compliance-требование или security-инцидент |
| TLS на Postgres (`sslmode=require`) | `sslmode=prefer` | Postgres в приватной сети Beget, TLS на нем еще не настроен. `prefer` - TLS если сервер поддерживает, иначе plain | Когда выкатим cert-manager на db-vps |
| Trivy в CI: блокировать билд | `exit-code: 0` (информирует, не падает) | На старте корпус ignore'ов пуст - любая случайная CVE упадет билд. Сначала набираем `.trivyignore` | Когда отчеты стабилизируются и появится приоритезация CVE |
| Zabbix | Не используем | Дублирует Prometheus + Loki + Tempo, которые уже есть | Никогда (с большой вероятностью) |

## Принято и сделано

| Тема | Решение | Почему |
|:--|:--|:--|
| voice-service SessionStore | `RedisSessionStore` (Hash `voice:session:{userId}`, Set `voice:channel:{channelId}`, DB=3, TTL=8h) вместо `ConcurrentDictionary` | In-memory Singleton привязывал сессию к поду: `/leave` на другом поде возвращал 404. Redis - уже в инфре, данные эфемерные. `ClearChannel` - Lua-скрипт (атомарный SMEMBERS+DEL), исключает двойной broadcast `voice.left` при параллельных вызовах. Ограничение: `Join` не атомарен (4 отдельных команды); гонка возможна только при одновременном join одного пользователя с двух устройств - на практике не происходит |
| SignalR Redis backplane | Реализовано: `builder.Services.AddSignalR().AddStackExchangeRedis(...)`, Redis DB=2. Все поды websocket-gateway шарят состояние соединений через Redis pub/sub - broadcast доходит до всех клиентов при любом числе реплик. Presence (ConcurrentDictionary) по-прежнему in-memory - сбрасывается при рестарте пода, клиент получает presence.offline и затем presence.online при следующем heartbeat. |
| GitOps через ArgoCD + Sealed Secrets | Приложение деплоит ArgoCD из git (`charts/nextalk` + `argocd/sealed`), а не Ansible. Секреты - Sealed Secrets: `make seal` рендерит Secret из самого чарта на значениях vault и запечатывает `kubeseal`, зашифрованный результат в git. CI при пуше в main коммитит `imageTag`=SHA. Закрывает сразу три бывших «отложено»: secrets-in-git, helm-CLI на CI-runner и доступ runner'а к k3s API (CI больше не ходит в кластер - туда тянет ArgoCD). `helm-deploy.yml` и `deploy.yml` удалены. Подробно - [gitops-argocd.md](gitops-argocd.md) |
| `:port` в Zitadel URL'ах | Убран из BASEURI и `CUSTOM_REQUEST_HEADERS` | Был артефактом docker-compose (`:8080`). В проде с 443/80 порт опускается, иначе ломается issuer |
| Login UI Zitadel | Sidecar в том же поде, что и API | Чтобы login Next.js видел PAT файл через общий PVC. Так же в docker-compose |
| Образы | Все теги пин-нуты, `latest` запрещен конвенцией | `latest` ломает воспроизводимость деплоя. Сейчас не enforce'нуто `fail`-валидацией, но в values только конкретные версии |
| Ingress | Три объекта (`nextalk-api`, `nextalk-grpc-web`, `nextalk-main`) на одном хосте | Per-Ingress аннотации (rewrite, use-regex, proxy-buffering) конфликтуют. Ingress-nginx склеивает на одном хосте сам |
| WebSocket путь | `/hubs` (SignalR convention .NET) | Совпадает с infra/nginx/nginx.conf.template |
| ghcr.io visibility | Публичный репо | Privacy не нужна, образы публичные. Не надо `imagePullSecret` |
| Public IP на VPS | Только `worker-1` (bastion+SSH), `worker-2/3` (ingress 80/443) | Остальные 5 VPS - только приватная сеть Beget. Меньше attack surface |
| Vault | `ansible-vault` (встроен в ansible-core, AES256+PBKDF2) | Никакого отдельного сервиса. Одна команда на encrypt/decrypt |
| kube-vip → HAProxy | HAProxy на отдельной ноде (10.19.0.51) вместо kube-vip ARP mode | Beget hypervisor фильтрует gratuitous ARP: `arp -n 10.19.0.10` на cp-2 - `(incomplete)`, ping 100% loss. kube-vip ARP mode физически невозможен. HAProxy работает на L3, health-check TCP, не требует ARP |

## Ссылки

- [Zitadel self-hosting (ExternalDomain/Port/Secure)](https://zitadel.com/docs/self-hosting/manage/custom-domain)
- [ingress-nginx annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- [k3s embedded etcd HA](https://docs.k3s.io/datastore/ha-embedded)
- [LiveKit ports & firewall](https://docs.livekit.io/realtime/self-hosting/ports-firewall/)
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action)
