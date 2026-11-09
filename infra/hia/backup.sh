#!/bin/sh
set -eu
PGUSER=${PGUSER:-${POSTGRES_USER:?Configurar PGUSER o POSTGRES_USER}}
export PGUSER
db=${1:?Indicar base}
case "$db" in convoca_lab_piloto_v2|convoca_lab_v2) ;; *) echo 'Base no permitida' >&2; exit 1;; esac
ready=$(psql -X -qAt -v ON_ERROR_STOP=1 -d "$db" -c 'SELECT completado FROM laboratorio.control_carga;')
if [ "$ready" != t ]; then echo 'Carga no completa; backup suspendido' >&2; exit 1; fi
mkdir -p /backups
name="${db}-$(date -u +%Y%m%dT%H%M%S)-$$"
tmp="/backups/$name.dump.partial"
if ! mkdir /backups/.lock 2>/dev/null; then echo 'Backup en curso; revisar .lock si el proceso murió' >&2; exit 1; fi
trap 'rm -f "$tmp"; rmdir /backups/.lock' EXIT HUP INT TERM
pg_dump -Fc --no-owner --no-acl -d "$db" -f "$tmp"
pg_restore --list "$tmp" >/dev/null
sha256sum "$tmp" | cut -d ' ' -f 1 > "/backups/$name.sha256"
psql -X -qAt -v ON_ERROR_STOP=1 -d "$db" -c "SELECT json_build_object('database',current_database(),'version',(SELECT version FROM laboratorio.control_carga),'perfil',(SELECT perfil FROM laboratorio.control_carga),'usuarios',(SELECT count(*) FROM \"Usuarios\"),'eventos',(SELECT count(*) FROM \"Eventos\"),'inscripciones',(SELECT count(*) FROM \"Inscripciones\"),'completado',(SELECT completado FROM laboratorio.control_carga),'servidor',current_setting('server_version'),'fecha',now());" > "/backups/$name.json"
mv "$tmp" "/backups/$name.dump"
# Dos recientes y la última restaurada/verificada (puede ser una tercera copia).
verified=$(ls -1t /backups/"$db"-*.verified.json 2>/dev/null | head -n 1 || true)
ls -1t /backups/"$db"-*.dump | tail -n +3 | while IFS= read -r old; do
  if [ "${old%.dump}.verified.json" != "$verified" ]; then
    rm -f "$old" "${old%.dump}.json" "${old%.dump}.sha256" "${old%.dump}.verified.json"
  fi
done
printf '%s\n' "$name"
