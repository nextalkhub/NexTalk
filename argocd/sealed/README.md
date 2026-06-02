# argocd/sealed

Сюда кладется зашифрованный секрет приложения - `nextalk-secrets.yaml` (kind `SealedSecret`).

Этот каталог - второй source ArgoCD-приложения (см. [../application.yaml](../application.yaml)).
ArgoCD применяет лежащий здесь `SealedSecret`, а контроллер sealed-secrets
расшифровывает его в обычный `Secret nextalk-secrets` уже внутри кластера.

## Откуда берется nextalk-secrets.yaml

Файл генерируется один раз (и пересоздается при смене секретов) из `ansible-vault`
и **самого чарта** - структура секрета не дублируется, она живет только в
[charts/nextalk/templates/secrets.yaml](../../charts/nextalk/templates/secrets.yaml):

```bash
cd infra/ansible
make seal              # рендерит секрет из чарта + vault и запечатывает kubeseal
git add ../../argocd/sealed/nextalk-secrets.yaml
git commit -m "secrets: обновить sealed nextalk-secrets"
git push
```

Зашифрованный `SealedSecret` безопасно лежит в git: расшифровать его может только
контроллер в этом кластере (его приватным ключом). Подробнее - [docs/gitops-argocd.md](../../docs/gitops-argocd.md).

Пока файл не закоммичен, поды приложения не стартуют (нет `nextalk-secrets`) - это
ожидаемо при первом bootstrap до шага `make seal`.
