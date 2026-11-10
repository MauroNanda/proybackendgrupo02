-- Crea o actualiza el login de replicación sin imprimir su contraseña.
\getenv replication_password REPLICATION_PASSWORD

SELECT format(
  'CREATE ROLE %I WITH LOGIN REPLICATION PASSWORD %L',
  'convoca_replicator',
  :'replication_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'convoca_replicator'
)
\gexec

SELECT format(
  'ALTER ROLE %I WITH LOGIN REPLICATION PASSWORD %L',
  'convoca_replicator',
  :'replication_password'
)
\gexec
