# Convoca G02: entrega y defensa

Responde a la **actividad 15 de HIA**: documentación técnica, reproducción y defensa de aproximadamente **20 minutos**. La consigna de referencia es `trabajo_integrador_2026.pdf` del aula; `CONSIGNA-TP-FINAL.md` conserva la consigna del proyecto original de otra materia.

## Por dónde empezar

1. Abrir Docker Desktop y esperar que el motor esté listo.
2. Abrir PowerShell **en la carpeta del backend**. Seguir [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md): recorrido **A** si ya se conservan migraciones/datos/configuración; **B** si falta preparar la base. No repetir la carga masiva para presentar.
3. Abrir otra terminal **en el frontend** y seguir su bloque de instalación. SheetJS requiere el verificador y `npm ci --allow-remote=root`, no una excepción global de npm.
4. Comprobar el login de organizador y asistente. Después levantar los servicios adicionales de los apartados A6/A10/A11/A12/A13/A14 de esa guía, solo para el circuito que se mostrará.
5. Abrir este recorrido de defensa y el informe de Drive. Las claves de administración se consultan en el registro privado del equipo; no van en pantalla ni en el repositorio.

No hace falta reinstalar PostgreSQL, Python, Nginx ni Mantis en Windows: sus servicios corren en Docker. Abrir Docker Desktop por sí solo no levanta toda la aplicación.

## Documentación obligatoria: dónde está cada cosa

El informe de Drive contiene la resolución de las actividades. Esta tabla orienta hacia las configuraciones y procedimientos ejecutables; no exige copiar todos los archivos en el informe.

| Punto de la consigna 15 | Material para consultar o mostrar |
|---|---|
| 1. Descripción de la aplicación | Informe A1 y [PROPUESTA.md](PROPUESTA.md): eventos, inscripción, asistencia y roles |
| 2. Arquitectura general | Informe A1 (diagrama inicial) y [arquitectura final](ARQUITECTURA_FINAL_HIA.md) |
| 3. Inventario tecnológico | Informe A1; `package.json`, Dockerfiles e imágenes fijadas en Compose |
| 4. Manual de instalación | [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md), recorridos A/B |
| 5. Configuración Docker | `Dockerfile`, `infra/compose.yaml`, `infra/compose.production.yaml` y sus equivalentes del frontend |
| 6. Migración y carga | [base-datos.md](base-datos.md), migraciones y `infra/hia/dataset.json` |
| 7. Optimización SQL | Informe A5: ocho casos, planes/tiempos y equivalencia; índices en `migrations/20261109232106-agregar-indices-optimizacion.js` |
| 8. Replicación | [replicacion-postgresql.md](replicacion-postgresql.md): principal, standby, WAL y prueba directa |
| 9. CI/CD | `.github/workflows/ci.yml` de ambos repositorios; integración automática y publicación manual, sin atribuirle CD automático |
| 10. Publicación en Internet | Informe A9 y [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md), alcance de publicación; renovar el túnel antes de presentar |
| 11. Monitoreo | [monitoreo.md](monitoreo.md), Prometheus y Grafana |
| 12. Incidencias | [mantis-a11.md](mantis-a11.md), tickets y trazabilidad |
| 13. n8n | [AUTOMATIZACIONES_A13.md](AUTOMATIZACIONES_A13.md), tres flujos y flujo adicional de seguridad |
| 14. Seguridad | [SEGURIDAD_A14.md](SEGURIDAD_A14.md): matriz, escaneos, controles y respuesta |
| 15. Backup/restauración | [base-datos.md](base-datos.md), `lab:backup`, `lab:restore-test` y aprobación en A13 |
| 16. Limitaciones/mejoras futuras | Apartado siguiente y resoluciones A4/A8/A13/A14 |

## Arquitectura que se defiende

**Navegador → HTTPS temporal → Nginx/Angular → Express → PostgreSQL principal.** La réplica recibe WAL del principal, no peticiones de la aplicación. Prometheus reúne métricas y Grafana las presenta. n8n integra alertas/operaciones permitidas con Mantis, Nextcloud y Mailpit.

Mantis usa su propia MariaDB y Nextcloud otra base de su instalación. **Convoca sigue usando PostgreSQL**: esas bases auxiliares no reemplazan la de la aplicación.

## Qué dejar preparado antes de compartir pantalla

| Pestaña o ventana | Comprobación previa |
|---|---|
| Aplicación pública HTTPS | Carga y permite login; URL temporal vigente y origen de la API configurado para esa URL |
| Aplicación local | Alternativa para explicar el circuito si cae Internet; no sustituye la prueba externa requerida |
| GitHub: tablero y PR | Tareas, commits, revisión y checks reales; distinguir CI aprobado de aprobación de otro integrante |
| pgAdmin o terminal PostgreSQL | Base piloto, consulta de estado de réplica y ejemplo de plan SQL ya preparados |
| Grafana/Prometheus | Targets con datos recientes, no únicamente una captura histórica |
| Mantis, n8n y Mailpit | Ticket identificado y ejecución correspondiente; sin cabeceras de autenticación en pantalla |
| Nextcloud e informe | Carpeta compartida y versión de entrega legibles con una cuenta del equipo |

Usar dos perfiles del navegador para los roles. Las credenciales `lab.1@convoca.test` y `lab.2@convoca.test`, ambas con `DemoConvoca2026!`, pertenecen únicamente al piloto sintético. No reutilizarlas fuera del laboratorio.

## Recorrido de 20 minutos

Los tiempos son orientativos y suman veinte minutos. La duración proviene de la consigna. El reparto siguiente es una **propuesta de exposición**, no un registro de participación ni un ensayo ya realizado; todos deben entender el circuito completo.

| Tiempo | Quién (propuesta) | Mostrar y hacer | Explicación breve |
|---|---|---|---|
| 00:00–02:00 | Mauro | Aplicación HTTPS y diagrama final | Qué resuelve Convoca; frontend, API y datos son componentes distintos |
| 02:00–04:00 | Mauro | Tablero, un PR y CI verde; dos Dockerfiles | Trazabilidad del trabajo, integración por PR y diferencia entre imagen y contenedor |
| 04:00–07:00 | Luca/Mauri | Organizador crea un evento futuro; asistente se inscribe y ve QR; organizador marca asistencia | Los roles tienen permisos distintos; la transacción y el bloqueo ayudan a mantener el cupo |
| 07:00–10:00 | Juan | Un caso SQL antes/después y su plan; manifiesto/conteos; un backup y restore-test ya verificados | No comparar consultas con resultados distintos; un índice tiene costo y una copia se valida restaurando |
| 10:00–12:00 | Gabriel | Identidad del principal y standby, `pg_stat_replication`; explicar evidencia de propagación | Réplica física asíncrona: no es backup ni failover automático |
| 12:00–14:00 | Gabriel | Grafana y targets de Prometheus | Distinguir caída de una aplicación, caída del recolector y falta de datos |
| 14:00–17:00 | Delia | Un ticket Mantis, ejecución n8n y aviso local; documento compartido en Nextcloud | Detectar, registrar, avisar y conservar trazabilidad. Una restauración exige aprobación |
| 17:00–20:00 | Mauro y grupo | Resultado A14, controles comentados, limitaciones y cierre | JWT/roles, límites, dependencias y recuperación; mostrar resultados sin afirmar seguridad absoluta |

**No ejecutar toda la carga masiva ni reinstalar durante los veinte minutos.** Mostrar los resultados identificados y ejecutar una prueba breve. Un evento de demostración debe tener fecha futura; los datos sintéticos antiguos pueden no aparecer en el catálogo público.

## Código con comentarios: por dónde estudiarlo

Los comentarios explican decisiones, no sustituyen saber seguir una petición. Abrir el archivo y ubicar el bloque indicado. Los identificadores de línea cambian; por eso se usan funciones/nombres estables.

| Pregunta posible | Abrir y señalar | Idea a explicar |
|---|---|---|
| ¿Cómo llega una petición a la base? | `app.js` → `routes/` → controlador → `services/` → modelo | Orden de middlewares y separación de responsabilidades |
| ¿Qué valida el JWT? | `middlewares/auth.middleware.js`, `utils/jwt.util.js` | Firma/vencimiento; decodificar no autentica. 401 es falta de sesión, 403 falta de permiso |
| ¿Por qué un guard Angular no basta? | Frontend `auth.guard.ts`, `role.guard.ts`; backend `role.middleware.js` | El navegador orienta la navegación; el servidor aplica la autorización |
| ¿Dónde está la sesión? | Frontend `auth.service.ts` e interceptor de credenciales | El usuario cacheado sirve a la interfaz; la cookie httpOnly es gestionada por la API |
| ¿Cómo se evita exceder el cupo? | `services/inscripcion.service.js`, método `inscribirse` | Transacción, bloqueo de fila, conteo y confirmación/reversión |
| ¿Cómo se controla qué se puede modificar? | `services/evento.service.js`, campos permitidos | El cliente no impone identificadores ni fechas internas |
| ¿Qué acelera un índice? | Migración de A5 y plan medido | Columnas, orden, selectividad y costo al escribir; no afirmar que siempre se usará |
| ¿Réplica y backup son lo mismo? | `replica-entrypoint.sh` y `backup.sh` | WAL replica cambios, incluso errores; el respaldo permite recuperar otro estado |
| ¿EXPOSE publica el puerto? | Dockerfiles y `ports` de Compose | EXPOSE documenta; el mapeo publica. `localhost` cambia según host o contenedor |
| ¿Para qué hay dos etapas en el frontend? | Frontend `Dockerfile.production` | Node compila; Nginx sirve el resultado, sin compilador Angular en la imagen final |
| ¿Por qué no confiar en cualquier X-Forwarded-For? | Nginx y `config/security.js` | Un cliente puede inventar la cabecera y evadir límites si se confía sin controlar el proxy |
| ¿Qué ejecuta n8n en la computadora? | `scripts/n8n-runner.js` | Lista cerrada de operaciones, token y aprobación de restore-test; no shell arbitrario |
| ¿Una métrica ausente equivale a cero? | `scripts/informe_metricas.py` | Falta de datos es distinta de disponibilidad falsa o valor cero |
| ¿Qué garantiza el hash? | `backup.sh`, guard de dependencias frontend | Integridad de bytes; no demuestra por sí solo que un respaldo restaura ni que todo código sea seguro |

## Resultados de la comprobación A15

Se ensayó una instalación nueva en un proyecto Docker separado, con claves y volúmenes propios. No se reutilizó ni se borró la carga masiva del equipo. Los resultados sanitizados están en [evidencias/actividad15](evidencias/actividad15/README.md).

La prueba nueva cubre migraciones, piloto, API, navegador con ambos roles, creación/inscripción/QR/check-in, restricciones del asistente, copia/restauración y estado de réplica. Los comentarios se contrastaron con los commits base mediante AST o instrucciones normalizadas. Se conservó la política LF de shell ya existente; la lista de publicación documental incorpora los manuales nuevos.

La verificación automatizada desde esta computadora **no acredita un ensayo grupal ni la reproducción independiente por otra persona**. Antes de exponer, un compañero debe seguir el manual y el grupo ensayar el recorrido. Registrar solo cuando ocurra: integrante, fecha, versión, resultado y observación relevante. No inventar ese registro para cerrar la actividad.

## Límites que debemos poder explicar

- El dataset completo declara 100.000 usuarios, 10.000 eventos y 6.000.000 inscripciones. No afirmar seis millones en cada tabla. La interpretación respecto del enunciado debe quedar explícita.
- Los ocho casos SQL medidos y los cambios efectivamente incorporados son cosas distintas; el dashboard conserva consultas con `COUNT(id)`.
- Los workflows actuales integran y verifican automáticamente. La publicación/rollback siguen siendo operaciones manuales; no presentarlos como CD automático.
- La réplica es asíncrona y no promueve automáticamente otro principal. Un standby no reemplaza una copia histórica.
- El HTTPS temporal depende del túnel y de los servicios disponibles. La URL puede cambiar al reiniciarlo; una URL antigua no demuestra disponibilidad actual.
- Mailpit es correo local. n8n y la API tienen límites de deduplicación/entrega documentados; no hay garantía de entrega exactamente una vez ni de cola durable de la API.
- Persisten avisos de dependencias de desarrollo. A14 no es un pentest completo ni demuestra protección ante un DDoS volumétrico.
- Las cuentas simplificadas de herramientas son para laboratorio, no un modelo de seguridad para producción real.

## Si algo falla durante la defensa

1. Identificar qué falla: navegador, API (`/api/health`), base, túnel o integración. No reiniciar todo sin comprobar.
2. Si cayó Internet/túnel, mostrar el estado y pasar al acceso local para continuar la explicación. Recuperar y repetir el acceso HTTPS; no presentarlo como prueba externa aprobada mientras siga caído.
3. Si falla una automatización, abrir su ejecución y ticket. Conservar el aviso pendiente y seguir la recuperación de A13/A14; no repetir una restauración para reenviar un correo.
4. Si hay un problema de versión, volver de forma coordinada a una revisión identificada y reconstruir la imagen. No reemplazar bases ni ejecutar `down -v`.
5. Restaurar datos solo después de comprobar copia e integridad y recibir aprobación. Ensayar primero en base temporal; no usar una restauración productiva improvisada como demostración.

## Versión y cierre

La base integrada contrastada es backend `9c206d4` y frontend `75eb62a`. Las ramas `docs/cierre-entrega-a15` y `docs/comentarios-defensa-a15` agregan este cierre y los comentarios. Sus PR se revisan contra `develop`; **este trabajo no fusiona develop a main ni crea una entrega estable sin revisión**.

Después de integrar ambos PR, registrar los SHA finales de ambos repositorios en el manifiesto de entrega. Si el equipo decide publicar un tag, debe apuntar a esos commits. Guardar en Nextcloud la exportación vigente del informe y la guía, con sus hashes y procedencia. Conservar el diagrama inicial y el final: no reemplazar retrospectivamente el diagnóstico.
