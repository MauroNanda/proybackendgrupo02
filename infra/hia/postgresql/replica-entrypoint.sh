#!/bin/sh
set -eu

PGPASSFILE="${PGPASSFILE:-/var/lib/postgresql/.pgpass}"
export PGPASSFILE

# La contraseña queda en el volumen/capa escribible local del contenedor, nunca en la imagen.
umask 077
printf 'db-principal:5432:replication:%s:%s\n' "$REPLICATION_USER" "$REPLICATION_PASSWORD" > "$PGPASSFILE"
chown postgres:postgres "$PGPASSFILE"
chmod 0600 "$PGPASSFILE"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"
  gosu postgres pg_basebackup \
    --host=db-principal \
    --port=5432 \
    --username="$REPLICATION_USER" \
    --pgdata="$PGDATA" \
    --format=plain \
    --wal-method=stream \
    --progress \
    --write-recovery-conf
  printf "\nprimary_conninfo = 'host=db-principal port=5432 user=%s application_name=convoca-replica'\n" "$REPLICATION_USER" >> "$PGDATA/postgresql.auto.conf"
  chown postgres:postgres "$PGDATA/postgresql.auto.conf"
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
