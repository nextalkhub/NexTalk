{{/*
Политика масштабирования HPA, общая для всех сервисов.
scaleUp с окном 120с: HPA берёт минимум рекомендаций за окно, поэтому
секундные стартовые спайки CPU (.NET JIT/прогрев) не вызывают рост реплик.
Лимит политик ограничивает скорость: +2 пода/мин вверх, -1 под/2мин вниз.
*/}}
{{- define "nextalk.hpaBehavior" -}}
behavior:
  scaleUp:
    stabilizationWindowSeconds: 120
    policies:
      - type: Pods
        value: 2
        periodSeconds: 60
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Pods
        value: 1
        periodSeconds: 120
{{- end -}}
