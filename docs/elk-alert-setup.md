# Настройка оповещений в Elastic - Уведомления об ошибках на Email

**Путь в интерфейсе:** Kibana → Stack Management → Rules → Create rule.  
После поднятия кластера интерфейс доступен по адресу: `http://<node-ip>/monitoring/kibana`

---

## Предварительные требования

- ELK-стек развернут в кластере (`k8s/14-elasticsearch.yaml`, `k8s/15-kibana.yaml`, `k8s/16-filebeat.yaml`)
- Логи текут в индекс `nextalk-logs-*` (посмотреть можно через **Discover**)
- SMTP-сервер доступен из пода Kibana

---

## Шаг 1 - Настройка почтового коннектора

1. Открой **Stack Management → Connectors → Create connector**
2. Выбери тип **Email**
3. Заполни поля:

   | Поле | Значение |
   |---|---|
   | Name | `SMTP Alert` |
   | Host | `<smtp-хост>` |
   | Port | `587` |
   | Secure | TLS |
   | Username | `<smtp-пользователь>` |
   | Password | `<smtp-пароль>` |
   | From | `alerts@<твой-домен>` |

4. Нажми **Test** → **Save**

---

## Шаг 2 - Создание правила оповещения

1. Открой **Stack Management → Rules → Create rule**
2. Выбери тип правила: **Elasticsearch query**
3. Настрой параметры:

   | Параметр | Значение |
   |---|---|
   | Name | `NexTalk Error Logs` |
   | Index | `nextalk-logs-*` |
   | Time field | `@timestamp` |
   | Check every | `1 minute` |
   | Notify | `Every time rule is active` |

4. **Запрос** (на языке KQL):
   ```
   log.level: "error" OR level: "Error"
   ```
   Или в виде Elasticsearch JSON-запроса:
   ```json
   {
     "query": {
       "bool": {
         "should": [
           { "term": { "log.level": "error" } },
           { "term": { "level": "Error" } }
         ],
         "minimum_should_match": 1
       }
     }
   }
   ```

5. **Порог срабатывания:** `IS ABOVE 0` за последнюю `1 минуту`

6. В секции **Actions** → выбери коннектор `SMTP Alert`:
   - **To**: `<получатель@твой-домен>`
   - **Subject**: `[NexTalk] Обнаружена ошибка в логах`
   - **Body**:
     ```
     {{context.title}}

     За последнюю минуту обнаружено {{context.hits}} ошибочных записей в логах.

     Сервис: {{context.hits.hits.0._source.kubernetes.labels.app}}
     Сообщение: {{context.hits.hits.0._source.message}}
     Время: {{context.hits.hits.0._source.@timestamp}}

     Посмотреть в Kibana: {{context.link}}
     ```

7. Нажми **Save**

---

## Шаг 3 - Проверка поступления логов в индекс

В разделе **Discover** укажи индексный шаблон `nextalk-logs-*` и выполни поиск:
```
log.level: "error"
```

Чтобы сгенерировать тестовую ошибку, дерни несуществующий эндпоинт или спровоцируй ошибку валидации в guild-service. Serilog запишет структурированную JSON-ошибку, а Filebeat отправит ее в Elasticsearch.

---

## Формат JSON-логов Serilog (справочно)

Все сервисы NexTalk пишут компактный JSON через `Serilog.Formatting.Compact`:
```json
{
  "@t": "2026-01-15T10:30:00.000Z",
  "@mt": "Промах кэша по ключу {Key}. Сохранено: {Value}",
  "@l": "Information",
  "Key": "probe:shared",
  "Value": "установлен guild-service-7f9d8 в 2026-01-15T10:30:00Z",
  "MachineName": "guild-service-7f9d8-xk2p1"
}
```

Ошибочные логи содержат `@l: "Error"`. Процессор `decode_json_fields` в Filebeat разбирает поле `message`, поэтому Elasticsearch получает все структурированные поля для фильтрации.