-- Ejecutar mediante npm run lab:seed. psql debe usar autocommit (NO -1).
\set ON_ERROR_STOP on
\timing on
SET application_name = 'convoca_lab_seed';
-- Los parámetros se cargan mediante set_config antes de este archivo.
DO $$
DECLARE
  p text := current_setting('lab.perfil');
  v text := current_setting('lab.version');
  u integer := current_setting('lab.usuarios')::integer;
  e integer := current_setting('lab.eventos')::integer;
  r bigint := current_setting('lab.inscripciones')::bigint;
  lote integer := current_setting('lab.lote')::integer;
  ref timestamptz := current_setting('lab.referencia')::timestamptz;
  hasta bigint;
  avance bigint;
  caliente integer := e / 10;
  c record;
BEGIN
  IF current_database() <> current_setting('lab.database') OR
     current_database() NOT IN ('convoca_lab_piloto_v2','convoca_lab_v2') THEN
    RAISE EXCEPTION 'Destino no permitido';
  END IF;
  IF NOT pg_try_advisory_lock(42704,6000000) THEN RAISE EXCEPTION 'Otra carga está activa'; END IF;
  CREATE SCHEMA IF NOT EXISTS laboratorio;
  CREATE TABLE IF NOT EXISTS laboratorio.control_carga (
    unico boolean PRIMARY KEY DEFAULT true CHECK (unico),
    version text NOT NULL, perfil text NOT NULL,
    usuarios integer NOT NULL, eventos integer NOT NULL, inscripciones bigint NOT NULL,
    referencia timestamptz NOT NULL, ultimo bigint NOT NULL DEFAULT 0,
    iniciado timestamptz NOT NULL DEFAULT clock_timestamp(),
    actualizado timestamptz NOT NULL DEFAULT clock_timestamp(), completado boolean NOT NULL DEFAULT false
  );
  IF NOT EXISTS (SELECT FROM laboratorio.control_carga) THEN
    IF EXISTS (SELECT FROM "Usuarios") OR EXISTS (SELECT FROM "Eventos") OR EXISTS (SELECT FROM "Inscripciones") THEN
      RAISE EXCEPTION 'La base contiene datos ajenos. No se borran ni mezclan; use un destino vacío';
    END IF;
    INSERT INTO laboratorio.control_carga(version,perfil,usuarios,eventos,inscripciones,referencia)
      VALUES(v,p,u,e,r,ref);
    -- Dos cuentas de demostración dentro del total; hash bcrypt preparado por Node.
    INSERT INTO "Usuarios"(id,nombre,username,email,password,rol,two_factor_enabled,"createdAt","updatedAt")
      SELECT md5(v||':usuario:'||n)::uuid,
        CASE n WHEN 1 THEN 'Organizador laboratorio' WHEN 2 THEN 'Asistente laboratorio' ELSE 'Usuario sintético '||n END,
        'lab_'||n, 'lab.'||n||'@convoca.test',
        CASE WHEN n <= 2 THEN current_setting('lab.demo_hash') ELSE NULL END,
        (CASE WHEN n=1 THEN 'ORGANIZADOR' ELSE 'ASISTENTE' END)::"enum_Usuarios_rol",
        false, timestamptz '2024-01-01Z', timestamptz '2024-01-01Z'
      FROM generate_series(1,u) n;
    INSERT INTO "Eventos"(id,titulo,descripcion,fecha,ubicacion,cupo_maximo,estado,"createdAt","updatedAt")
      SELECT md5(v||':evento:'||n)::uuid, 'Evento laboratorio '||n,
        'Datos sintéticos reproducibles; evento '||n,
        ref + (((n*37) % 730)-365)*interval '1 day',
        'Sede '||(n % 8),
        greatest(1,ceil((CASE WHEN n<=caliente THEN r/2.0/caliente ELSE r/2.0/(e-caliente) END)*0.6)::integer),
        (CASE WHEN n%20=0 THEN 'CANCELADO' ELSE 'PUBLICADO' END)::"enum_Eventos_estado",
        timestamptz '2024-01-01Z', timestamptz '2024-01-01Z'
      FROM generate_series(1,e) n;
  END IF;
  SELECT * INTO c FROM laboratorio.control_carga;
  IF (c.version,c.perfil,c.usuarios,c.eventos,c.inscripciones,c.referencia) IS DISTINCT FROM (v,p,u,e,r,ref) THEN
    RAISE EXCEPTION 'Perfil, versión u objetivos incompatibles con la carga existente';
  END IF;
  IF (SELECT count(*) FROM "Usuarios")<>u OR (SELECT count(*) FROM "Eventos")<>e OR
     (SELECT count(*) FROM "Inscripciones")<>c.ultimo THEN
    RAISE EXCEPTION 'Conteos alterados respecto del avance; validar antes de reanudar';
  END IF;
  avance := c.ultimo;
  COMMIT;
  WHILE avance < r LOOP
    hasta := least(avance+lote,r);
    INSERT INTO "Inscripciones"(id,"usuarioId","eventoId",estado,qr_token,"createdAt","updatedAt")
    WITH grupo AS (
      SELECT n, CASE WHEN n<=r/2 THEN n-1 ELSE n-r/2-1 END AS k,
        CASE WHEN n<=r/2 THEN caliente ELSE e-caliente END AS ancho,
        CASE WHEN n<=r/2 THEN 0 ELSE caliente END AS desplazamiento
      FROM generate_series(avance+1,hasta) n
    ), pares AS (
      SELECT n, (k%ancho+1+desplazamiento)::integer AS evento, k/ancho AS turno FROM grupo
    ), filas AS (
      SELECT *, ((turno+evento*101)%(u-1)+2)::integer AS usuario FROM pares
    )
    SELECT md5(v||':inscripcion:'||f.n)::uuid, md5(v||':usuario:'||f.usuario)::uuid,
      ev.id,
      (CASE WHEN ev.estado='CANCELADO' OR f.turno%10=0 THEN 'CANCELADO'
        WHEN f.turno>=ev.cupo_maximo THEN 'ESPERA'
        WHEN ev.fecha<ref THEN 'ASISTIO' ELSE 'CONFIRMADO' END)::"enum_Inscripciones_estado",
      md5(v||':qr:'||f.n)::uuid,
      ev.fecha-interval '45 days'+(f.turno%30)*interval '1 day',
      CASE WHEN ev.fecha<ref AND f.turno<ev.cupo_maximo AND f.turno%10<>0 AND ev.estado<>'CANCELADO'
        THEN ev.fecha+interval '1 hour' ELSE ev.fecha-interval '1 day' END
    FROM filas f JOIN "Eventos" ev ON ev.id=md5(v||':evento:'||f.evento)::uuid;
    UPDATE laboratorio.control_carga SET ultimo=hasta, actualizado=clock_timestamp(), completado=(hasta=r);
    COMMIT;
    avance := hasta;
    IF avance % (lote*10) = 0 OR avance = r THEN RAISE NOTICE 'Avance % / %',avance,r; END IF;
  END LOOP;
  PERFORM pg_advisory_unlock(42704,6000000);
END $$;
ANALYZE "Usuarios";
ANALYZE "Eventos";
ANALYZE "Inscripciones";
SELECT version,perfil,usuarios,eventos,inscripciones,ultimo,completado,iniciado,actualizado
FROM laboratorio.control_carga;
