# argocd

GitOps-доставка NexTalk через ArgoCD. Приложение разворачивает и обновляет не
Ansible, а ArgoCD, синхронизируя [charts/nextalk](../charts/nextalk) из git.

Полный разбор - [docs/gitops-argocd.md](../docs/gitops-argocd.md).

## Файлы

- `project.yaml` - AppProject `nextalk`: ограничивает source-репо, целевой
  namespace и список разрешенных cluster-scoped ресурсов чарта.
- `application.yaml` - Application `nextalk`. Multi-source:
  1. `charts/nextalk` - Helm-чарт приложения (секреты не рендерятся,
     `secrets.create=false`);
  2. `argocd/sealed` - зашифрованный `SealedSecret`.
- `sealed/` - сюда `make seal` кладет `nextalk-secrets.yaml` (см. [sealed/README.md](sealed/README.md)).

## Как это работает

```
git push ──► ArgoCD ──► helm template charts/nextalk ──► kube-apiserver
                   └──► argocd/sealed/*.yaml ──► sealed-secrets controller ──► Secret
```

- **Версии образов**: CI при пуше в main коммитит SHA в `charts/nextalk/values.yaml`
  (`imageTag`), ArgoCD подхватывает коммит. Откат - `git revert`.
- **Секреты**: `make seal` берет значения из `ansible-vault`, рендерит Secret из
  чарта и запечатывает `kubeseal`. Зашифрованный результат лежит в git; расшифровать
  его может только контроллер в кластере.

## Установка

```bash
cd infra/ansible
make argocd   # ArgoCD + sealed-secrets + apply project/application
make seal     # запечатать секреты из vault
git add ../../argocd/sealed/nextalk-secrets.yaml && git commit -m "secrets: sealed" && git push
```
