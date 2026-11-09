\set ON_ERROR_STOP on
\timing on

DO $carga$
DECLARE
    objetivo CONSTANT integer := 6000000;
    lote CONSTANT integer := 10000;
    inicio integer := 1;
    fin integer;

    organizador CONSTANT uuid := '11111111-1111-1111-1111-111111111111';
    evento_base CONSTANT uuid := '22222222-2222-2222-2222-222222222222';

    lock_obtenido boolean;

    nuevos_usuarios bigint;
    nuevos_eventos bigint;
    nuevas_inscripciones bigint;
BEGIN

    SELECT pg_try_advisory_lock(42704, 6000000)
    INTO lock_obtenido;

    IF NOT lock_obtenido THEN
        RAISE EXCEPTION 'Ya se ejecuta otra carga optimizada. Esperar.';
    END IF;

    INSERT INTO "Usuarios"
        (id, nombre, email, password, rol, "createdAt", "updatedAt")
    VALUES
        (
            organizador,
            'Organizador Masivo',
            'masivo@demo.com',
            'hash_dummy',
            'ORGANIZADOR',
            now(),
            now()
        )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO "Eventos"
        (
            id,
            titulo,
            descripcion,
            fecha,
            ubicacion,
            cupo_maximo,
            estado,
            "createdAt",
            "updatedAt"
        )
    VALUES
        (
            evento_base,
            'Evento de Carga Actividad 4',
            'Prueba de estrés 1000',
            now() + interval '30 days',
            'UNJu',
            2000,
            'PUBLICADO',
            now(),
            now()
        )
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (
        SELECT 1
        FROM "Usuarios"
        WHERE id = organizador
          AND email = 'masivo@demo.com'
    ) THEN
        RAISE EXCEPTION
        'Conflicto: ID del organizador ocupado por otro usuario.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "Eventos"
        WHERE id = evento_base
          AND titulo = 'Evento de Carga Actividad 4'
    ) THEN
        RAISE EXCEPTION
        'Conflicto: ID del evento base ocupado por otro evento.';
    END IF;

    COMMIT;

    WHILE inicio <= objetivo LOOP

        fin := LEAST(inicio + lote - 1, objetivo);

        INSERT INTO "Usuarios"
            (
                id,
                nombre,
                email,
                password,
                rol,
                "createdAt",
                "updatedAt"
            )
        SELECT
            gen_random_uuid(),
            'Usuario ' || n,
            'sintetico_' || n || '@demo.com',
            'hash_dummy',
            'ASISTENTE',
            now(),
            now()
        FROM generate_series(inicio, fin) AS n
        ON CONFLICT (email) DO NOTHING;

        GET DIAGNOSTICS nuevos_usuarios = ROW_COUNT;

        INSERT INTO "Eventos"
            (
                id,
                titulo,
                descripcion,
                fecha,
                ubicacion,
                cupo_maximo,
                estado,
                "createdAt",
                "updatedAt"
            )
        SELECT
            gen_random_uuid(),
            'Evento sintético ' || n,
            'Datos de laboratorio para pruebas de rendimiento',
            now() + interval '30 days' +
            (n % 365) * interval '1 day',
            'UNJu - Sede ' || (n % 10),
            100 + (n % 900),
            'PUBLICADO',
            now(),
            now()
        FROM generate_series(GREATEST(inicio, 2), fin) AS n
        WHERE inicio <= fin
          AND fin >= 2
        ON CONFLICT (id) DO NOTHING;

        GET DIAGNOSTICS nuevos_eventos = ROW_COUNT;

        INSERT INTO "Inscripciones"
            (
                id,
                "eventoId",
                "usuarioId",
                estado,
                qr_token,
                "createdAt",
                "updatedAt"
            )
        SELECT
            gen_random_uuid(),
            evento_base,
            u.id,
            'CONFIRMADO',
            gen_random_uuid(),
            now(),
            now()
        FROM generate_series(inicio, fin) AS n
        JOIN "Usuarios" u
            ON u.email = 'sintetico_' || n || '@demo.com'
        WHERE NOT EXISTS (
            SELECT 1
            FROM "Inscripciones" i
            WHERE i."usuarioId" = u.id
              AND i."eventoId" = evento_base
        );

        GET DIAGNOSTICS nuevas_inscripciones = ROW_COUNT;

        COMMIT;

        RAISE NOTICE
        'Lote %..% confirmado | Usuarios +% | Eventos +% | Inscripciones +%',
        inicio,
        fin,
        nuevos_usuarios,
        nuevos_eventos,
        nuevas_inscripciones;

        inicio := fin + 1;

    END LOOP;

    PERFORM pg_advisory_unlock(42704, 6000000);

    RAISE NOTICE 'Carga finalizada. Revisar conteos.';

END
$carga$;

ANALYZE "Usuarios";
ANALYZE "Eventos";
ANALYZE "Inscripciones";

SELECT 'Usuarios' AS tabla,
       count(*)  AS registros
FROM "Usuarios"

UNION ALL

SELECT 'Eventos',
       count(*)
FROM "Eventos"

UNION ALL

SELECT 'Inscripciones',
       count(*)
FROM "Inscripciones";

SELECT count(*) AS usuarios_sinteticos
FROM "Usuarios"
WHERE email ~ '^sintetico_[0-9]+@demo[.]com$';

SELECT count(*) AS eventos_sinteticos
FROM "Eventos"
WHERE titulo LIKE 'Evento sintético %';

SELECT count(*) AS inscripciones_evento_base
FROM "Inscripciones"
WHERE "eventoId" =
'22222222-2222-2222-2222-222222222222'::uuid;