\set ON_ERROR_STOP on
SET application_name='convoca_lab_validate';
DO $$
DECLARE c record; n bigint;
BEGIN
  SELECT * INTO STRICT c FROM laboratorio.control_carga;
  IF NOT c.completado OR c.ultimo<>c.inscripciones THEN RAISE EXCEPTION 'Carga incompleta'; END IF;
  IF c.version<>current_setting('lab.version') OR c.perfil<>current_setting('lab.perfil') OR
    c.usuarios<>current_setting('lab.usuarios')::integer OR c.eventos<>current_setting('lab.eventos')::integer OR
    c.inscripciones<>current_setting('lab.inscripciones')::bigint OR
    c.referencia<>current_setting('lab.referencia')::timestamptz THEN RAISE EXCEPTION 'Manifiesto incompatible'; END IF;
  IF (SELECT count(*) FROM "Usuarios")<>c.usuarios OR (SELECT count(*) FROM "Eventos")<>c.eventos OR
    (SELECT count(*) FROM "Inscripciones")<>c.inscripciones THEN RAISE EXCEPTION 'Conteos incorrectos'; END IF;
  IF EXISTS(SELECT FROM "Inscripciones" i LEFT JOIN "Usuarios" u ON u.id=i."usuarioId" LEFT JOIN "Eventos" e ON e.id=i."eventoId" WHERE u.id IS NULL OR e.id IS NULL) THEN RAISE EXCEPTION 'Referencias huérfanas'; END IF;
  IF EXISTS(SELECT FROM "Inscripciones" GROUP BY "usuarioId","eventoId" HAVING count(*)>1) THEN RAISE EXCEPTION 'Pares duplicados'; END IF;
  IF EXISTS(SELECT FROM "Inscripciones" i JOIN "Eventos" e ON e.id=i."eventoId"
    WHERE i."createdAt">i."updatedAt" OR i."createdAt">e.fecha OR i."createdAt"<e."createdAt"
      OR (e.estado='CANCELADO' AND i.estado<>'CANCELADO')
      OR (i.estado='ASISTIO' AND e.fecha>=c.referencia)
      OR (i.estado='CONFIRMADO' AND e.fecha<c.referencia)) THEN RAISE EXCEPTION 'Estados o fechas incoherentes'; END IF;
  IF EXISTS(SELECT FROM "Eventos" e JOIN "Inscripciones" i ON i."eventoId"=e.id
    WHERE i.estado IN ('CONFIRMADO','ASISTIO') GROUP BY e.id,e.cupo_maximo HAVING count(*)>e.cupo_maximo) THEN RAISE EXCEPTION 'Cupo excedido'; END IF;
  SELECT count(*) INTO n FROM pg_constraint WHERE conrelid='"Inscripciones"'::regclass AND contype='f' AND convalidated;
  IF n<>2 THEN RAISE EXCEPTION 'Faltan claves foráneas validadas'; END IF;
  IF NOT EXISTS(SELECT FROM pg_indexes WHERE tablename='Inscripciones' AND indexname='idx_inscripciones_evento_estado') OR
     NOT EXISTS(SELECT FROM pg_indexes WHERE tablename='Inscripciones' AND indexname='idx_inscripciones_usuario') THEN RAISE EXCEPTION 'Faltan índices de partida'; END IF;
END $$;
SELECT json_build_object(
  'validacion','OK','database',current_database(),'servidor',current_setting('server_version'),
  'control',(SELECT row_to_json(c) FROM laboratorio.control_carga c),
  'conteos',json_build_object('Usuarios',(SELECT count(*) FROM "Usuarios"),'Eventos',(SELECT count(*) FROM "Eventos"),'Inscripciones',(SELECT count(*) FROM "Inscripciones")),
  'estados',(SELECT json_object_agg(estado,n) FROM (SELECT estado,count(*) n FROM "Inscripciones" GROUP BY estado) s),
  'popularidad',(SELECT json_build_object('min',min(n),'max',max(n),'eventos_con_inscripciones',count(*)) FROM (SELECT "eventoId",count(*) n FROM "Inscripciones" GROUP BY "eventoId") s),
  'tamano',(SELECT json_agg(json_build_object('tabla',relname,'datos_bytes',pg_relation_size(relid),'total_bytes',pg_total_relation_size(relid))) FROM pg_stat_user_tables WHERE schemaname='public' AND relname IN ('Usuarios','Eventos','Inscripciones')),
  'restricciones',(SELECT json_agg(x ORDER BY x::text) FROM (SELECT conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) x FROM pg_constraint WHERE connamespace='public'::regnamespace) s),
  'muestra',json_build_object(
    'usuarios',(SELECT md5(string_agg(row_to_json(s)::text,'' ORDER BY id)) FROM (SELECT * FROM "Usuarios" ORDER BY id LIMIT 50) s),
    'eventos',(SELECT md5(string_agg(row_to_json(s)::text,'' ORDER BY id)) FROM (SELECT * FROM "Eventos" ORDER BY id LIMIT 50) s),
    'inscripciones',(SELECT md5(string_agg(row_to_json(s)::text,'' ORDER BY id)) FROM (SELECT * FROM "Inscripciones" ORDER BY id LIMIT 50) s))
);
