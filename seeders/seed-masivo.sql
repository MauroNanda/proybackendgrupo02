-- 1. Insertar organizador y evento base
INSERT INTO "Usuarios" (id, nombre, email, password, rol, "createdAt", "updatedAt") 
VALUES ('11111111-1111-1111-1111-111111111111', 'Organizador Masivo', 'masivo@demo.com', 'hash_dummy', 'ORGANIZADOR', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Eventos" (id, titulo, descripcion, fecha, ubicacion, "cupo_maximo", estado, "createdAt", "updatedAt")
VALUES ('22222222-2222-2222-2222-222222222222', 'Evento de Carga Actividad 4', 'Prueba de estrés 6M', NOW() + INTERVAL '30 days', 'UNJu', 7000000, 'PUBLICADO', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Inyección masiva controlada en 120 lotes de 50.000
DO $$ 
DECLARE
    batch_size CONSTANT INT := 50000;
    i INT;
BEGIN
    FOR i IN 0..119 LOOP
        WITH nuevos_usuarios AS (
            INSERT INTO "Usuarios" (id, nombre, email, password, rol, "createdAt", "updatedAt")
            SELECT 
                gen_random_uuid(),
                'Usuario ' || (i * batch_size + g.seq),
                'sintetico_' || (i * batch_size + g.seq) || '@demo.com',
                'hash_dummy',
                'ASISTENTE',
                NOW(),
                NOW()
            FROM generate_series(1, batch_size) AS g(seq)
            RETURNING id
        )
        INSERT INTO "Inscripciones" (id, "eventoId", "usuarioId", estado, qr_token, "createdAt", "updatedAt")
        SELECT 
            gen_random_uuid(),
            '22222222-2222-2222-2222-222222222222',
            nu.id,
            'CONFIRMADO',
            gen_random_uuid(),
            NOW(),
            NOW()
        FROM nuevos_usuarios nu;
        
        RAISE NOTICE 'Lote % de 120 insertado correctamente', (i + 1);
    END LOOP;
END $$;