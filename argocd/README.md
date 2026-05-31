# argocd

Заготовка - в текущем деплое не используется.

Сейчас деплой идет через Ansible (`make helm`). ArgoCD планируется как замена для GitOps-подхода: авто-синхронизация чарта при пуше в main, rollback через UI.

Файлы:
- `project.yaml` - AppProject с ограничением namespace и source repo
- `application.yaml` - Application, указывает на `charts/nextalk`
