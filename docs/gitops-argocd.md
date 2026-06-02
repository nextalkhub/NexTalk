# GitOps через ArgoCD

Доставка приложения NexTalk в кластер по модели GitOps. Желаемое состояние
описано в git, ArgoCD сверяет кластер с репозиторием и подтягивает изменения.

До этого приложение деплоил Ansible (`helm-deploy.yml`, теперь удален). Теперь
Ansible отвечает только за инфраструктуру и установку ArgoCD; само приложение
разворачивает и обновляет ArgoCD.

---

## Содержание

1. [Разделение ответственности](#1-разделение-ответственности)
2. [Что лежит в git](#2-что-лежит-в-git)
3. [Секреты: Sealed Secrets](#3-секреты-sealed-secrets)
4. [Версии образов](#4-версии-образов)
5. [Первый запуск (bootstrap)](#5-первый-запуск-bootstrap)
6. [Обновление приложения](#6-обновление-приложения)
7. [Откат](#7-откат)
8. [Ограничения](#8-ограничения)

---

## 1. Разделение ответственности

| Слой | Кто отвечает |
|:--|:--|
| VPS, k3s HA, HAProxy, GRE/NAT, БД, observability | Ansible (`site.yml`) |
| ingress-nginx, cert-manager, metrics-server | Ansible (`cluster-addons.yml`) |
| ArgoCD + sealed-secrets controller | Ansible (`argocd.yml`) - один раз |
| Приложение NexTalk (деплой и обновления) | **ArgoCD** (из git) |

Ansible перестал деплоить приложение. Его задача - подготовить кластер, в котором
ArgoCD сам синхронизирует чарт.

## 2. Что лежит в git

```
charts/nextalk/            # Helm-чарт приложения (единственный источник структуры)
  values.yaml              #   prod-конфиг: domain, db.host, imageTag, secrets.create=false
argocd/
  project.yaml             # AppProject: репо, namespace, разрешенные cluster-ресурсы
  application.yaml         # Application: multi-source (чарт + sealed)
  sealed/
    nextalk-secrets.yaml   # SealedSecret (зашифрован, генерируется make seal)
```

`values.yaml` содержит только не-секретный prod-конфиг. Приватные IP (db-vps,
obs-vps) - это RFC1918, не секреты; они и так были в `values.yaml` для observability.

## 3. Секреты: Sealed Secrets

ArgoCD тянет из git и не имеет доступа к `ansible-vault`. Поэтому секреты не
рендерятся из values (`secrets.create=false`) - иначе они попали бы в git в
открытом виде. Вместо этого:

1. контроллер sealed-secrets в кластере держит пару ключей;
2. `make seal` рендерит Secret **из самого чарта** (`templates/secrets.yaml` с
   `secrets.create=true`) на значениях из vault и шифрует его публичным ключом
   контроллера через `kubeseal`;
3. зашифрованный `SealedSecret` коммитится в git - расшифровать его может только
   контроллер этого кластера своим приватным ключом;
4. ArgoCD применяет `SealedSecret`, контроллер разворачивает его в обычный
   `Secret nextalk-secrets`, на который ссылаются поды.

Структура секрета не дублируется: она живет только в `charts/nextalk/templates/secrets.yaml`.
`make seal` переиспользует этот же шаблон.

```bash
cd infra/ansible
make seal     # vault -> helm template -> kubeseal -> argocd/sealed/nextalk-secrets.yaml
git add ../../argocd/sealed/nextalk-secrets.yaml
git commit -m "secrets: обновить sealed nextalk-secrets"
git push
```

Менять секрет (новый пароль) = `ansible-vault edit ...`, затем `make seal` + commit.

## 4. Версии образов

Тег деплоя должен быть в git. Поле `imageTag` в `values.yaml` общее для пяти наших
сервисов (они собираются из одного коммита).

При пуше в `main` CI (`gitops-bump-tag` в `.github/workflows/ci-cd.yml`) после
публикации образов в GHCR записывает короткий SHA коммита в `imageTag` и пушит
коммит с `[skip ci]`. ArgoCD видит изменение и катит новую версию.

```
push main ─► CI собирает образы :<sha> ─► CI: imageTag=<sha> [skip ci] ─► ArgoCD sync
```

`[skip ci]` не дает воркфлоу зациклиться на собственном коммите.

## 5. Первый запуск (bootstrap)

```bash
cd infra/ansible
make deploy            # site.yml: вся инфра + cluster-addons + argocd.yml
# либо по шагам: make k3s && make addons && make argocd

make seal              # запечатать секреты из vault
git add ../../argocd/sealed/nextalk-secrets.yaml
git commit -m "secrets: sealed" && git push
```

После пуша ArgoCD синхронизирует приложение. Статус:

```bash
export KUBECONFIG=infra/ansible/kubeconfig
kubectl -n argocd get applications
kubectl -n nextalk get pods
# UI ArgoCD (через port-forward):
kubectl -n argocd port-forward svc/argocd-server 8080:80
# пароль admin:
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## 6. Обновление приложения

- **Код сервиса**: merge в `main` -> CI собирает образы и бампит `imageTag` -> ArgoCD катит.
- **Манифесты/конфиг**: правка `charts/nextalk/**` в git -> ArgoCD катит.
- **Секрет**: `ansible-vault edit` -> `make seal` -> commit.

Руками `kubectl edit`/`helm upgrade` не делаем - `selfHeal` откатит к состоянию из git.

## 7. Откат

```bash
git revert <commit>    # откатить imageTag или манифест
git push
```

или через ArgoCD UI/CLI: `argocd app rollback nextalk <revision>`.

## 8. Ограничения

- **TLS**: используется `tls.provider: letsencrypt` - cert-manager выписывает
  сертификат сам, в GitOps работает без доработок. Cloudflare у нас только DNS,
  сертификаты он не выдает; ветка `tls.provider: cloudflare` в чарте не задействована.
- **Push в main из CI**: `gitops-bump-tag` пушит в `main`. Если на `main` включена
  branch protection с обязательным PR - дать боту исключение или вынести bump в PR.
- **kubeseal-ключ**: приватный ключ контроллера живет в кластере. Потеря кластера =
  потеря возможности расшифровать старые `SealedSecret`. Ключ стоит бэкапить
  (`kubectl -n kube-system get secret -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml`).
