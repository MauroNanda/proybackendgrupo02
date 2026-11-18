# Estado técnico de HIA y cierre

Revisión: 18/11/2026. Base integrada: backend `9c206d4`, frontend `75eb62a`. A13 y A14 están integradas. Las comprobaciones nuevas de A15 se identifican aparte de las evidencias históricas.

**Empezar por [ENTREGA_Y_DEFENSA.md](ENTREGA_Y_DEFENSA.md)**: reúne los 16 puntos de documentación, manual A/B, arquitectura final, recorrido de veinte minutos y código para explicar.

| Actividad | Material disponible | Límite que debe explicarse |
|---|---|---|
| A1–A3 | Diagnóstico/arquitectura inicial, inventario, tablero, ramas y PR | CI aprobado y aprobación humana son cosas distintas; las excepciones se identifican |
| A4 | Piloto, dataset completo, migraciones, carga, backups y restore-test | Completo: 100.000 usuarios, 10.000 eventos y 6.000.000 inscripciones; no seis millones por tabla |
| A5 | Ocho casos medidos en el informe; índices y cambios incorporados | No confundir mediciones con ocho reescrituras: el dashboard conserva COUNT(id) |
| A6 | Réplica física asíncrona y evidencia de propagación | No hay failover automático; réplica no es backup |
| A7–A9 | Imágenes, Compose, CI, Nginx y HTTPS temporal | Despliegue/rollback manuales; renovar URL temporal y verificarla al presentar |
| A10 | Prometheus, exportadores y Grafana | Muestras de Docker no describen todo Windows ni registran cada SQL |
| A11–A12 | Mantis, tickets, Nextcloud con permisos/versiones y respaldo | Incidentes reproducidos no equivalen a fallas productivas; claves solo en registro privado |
| A13 | Tres flujos de alertas, backup/restauración e informe | Mailpit local; preservar volumen/clave n8n y aprobar acciones críticas |
| A14 | Matriz, controles, auditorías y respuesta; PR58/PR26 integrados | Avisos dev y límites documentados; no es un pentest |
| A15 | Guía, arquitectura final, comentarios y ensayo con piloto nuevo | Revisión de PR, ensayo grupal y reproducción independiente se registran cuando ocurran |

## Comprobación nueva

Se preparó un piloto con claves y volúmenes distintos. Se verificaron migraciones, carga, navegador con roles, inscripción/QR/asistencia, backup/restauración temporal, réplica y HTTPS. Ver `docs/evidencias/actividad15`: detalla alcance y resultados, sin publicar claves ni dumps.

Se conservaron los finales LF de shell establecidos en `.gitattributes`. Los comentarios se compararon por AST o instrucciones normalizadas, sin cambios de lógica. La lista de publicación a Nextcloud incorpora los manuales A13/A14/A15 y la arquitectura final; conserva el control de ediciones remotas.

Las evidencias previas conservan sus fechas. El ensayo automatizado desde esta computadora no acredita un ensayo oral grupal, la reproducción por otra persona ni acceso desde otro dispositivo.

## Cierre por el equipo

1. Revisar e integrar los PR documentales a develop.
2. Registrar los SHA finales y exportar informe/guía vigentes a Nextcloud.
3. Otro integrante sigue el manual A/B y registra su resultado.
4. Ensayar los veinte minutos y comprobar HTTPS el día de la defensa.

No se fusiona a main ni se crea un tag estable automáticamente. Corresponde al cierre coordinado por el equipo.
