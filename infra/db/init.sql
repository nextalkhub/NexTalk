-- Создаёт базу данных для Zitadel если её ещё нет.
-- Выполняется автоматически при первом запуске контейнера PostgreSQL.
SELECT 'CREATE DATABASE zitadel'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'zitadel')\gexec
