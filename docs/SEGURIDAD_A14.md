# A14: seguridad y respuesta a incidentes

Responde a la consigna 14 y a la tarea backend #38. Los controles se aplican a Convoca (Express, Angular, PostgreSQL y Docker) y al circuito de incidentes de n8n/Mantis. Los ensayos usan datos sintéticos y servicios locales; no se prueban ataques contra Neon ni contra terceros.

## 1. Reproducir en otro equipo

Requisitos: Docker Desktop iniciado, Git y Node.js 22.22.3 o posterior. Abrir PowerShell **en la carpeta del backend**. Actualizar `develop` cuando los PR de A14 estén integrados; durante la revisión, usar `feature/controles-seguridad` del backend y `fix/dependencias-seguridad-a14` del frontend. Conservar cambios propios: no usar reset ni borrar volúmenes.

Si ya tienen el piloto migrado y cargado, conservar `infra/hia/.env` y omitir su creación/migración/seed. Si no lo tienen, seguir primero [base-datos.md](base-datos.md), recorrido **piloto** (1.000 usuarios, 100 eventos y 10.000 inscripciones). No hace falta repetir la carga de seis millones para esta prueba.

```powershell
npm ci
npm run lab:up
npm run lab:migrate -- --perfil piloto
npm run lab:seed -- --perfil piloto
npm run lab:validate -- --perfil piloto
```

Para probar el circuito completo, tener A11 y A12 configuradas siguiendo [mantis-a11.md](mantis-a11.md), la guía de Nextcloud y [AUTOMATIZACIONES_A13.md](AUTOMATIZACIONES_A13.md). Las cuentas, claves y volúmenes son locales: copiar el repositorio no copia credenciales ni sesiones. Preparar y levantar n8n con sus scripts; estos conservan las claves existentes, crean la clave separada de A14 y publican los cuatro flujos:

```powershell
node scripts/n8n-lab.js preparar
node scripts/n8n-lab.js up
node scripts/configurar-seguridad.js --lab
docker compose --env-file infra/hia/.env -f infra/compose.yaml -f infra/seguridad/compose.ensayo.yaml up -d --build --wait
node scripts/validar-seguridad.js
```

El último comando comprueba permisos, entradas, límites y el recorrido real API → n8n → Mantis → Mailpit. Crea y elimina **solo su evento BORRADOR de ensayo**. La superposición `compose.ensayo.yaml` reduce el límite a 50 solicitudes cada 10 segundos; no usarla para publicación. La prueba envía como máximo 110 solicitudes adicionales a la API local y espera su recuperación. Si una cuenta de demostración cambió, resolver ese acceso antes de ejecutar el ensayo. No apuntar el script a una base real.

Después del ensayo, restablecer los límites normales recreando la API sin la superposición. Si se modificaron `API_RATE_MAX` o `API_RATE_WINDOW_MS` en el `.env`, retirarlas o volver a 300 y 300000:

```powershell
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --force-recreate --wait api
```

Abrir n8n en **http://localhost:5680**, flujo **A14 - Flujo 4**, pestaña **Executions**. Abrir Mantis en **http://localhost:8989** y Mailpit en **http://localhost:8028**. La API escucha en `API_PORT` del `.env` (3000 por defecto). La cuenta n8n es `admin@convoca.local`; su clave está en `N8N_ADMIN_PASSWORD`, sin publicarla ni capturar encabezados del webhook.

En **otra terminal, dentro del frontend**:

```powershell
node scripts/verificar-origen-dependencias.cjs
npm ci --allow-remote=root
npm test -- --watch=false
npm run build -- --configuration production
node scripts/verificar-exportacion.cjs
npm audit --omit=dev --audit-level=high
```

La única excepción externa permitida es SheetJS oficial 0.20.3, con URL fija y SHA-512 en el lockfile. El verificador rechaza otros orígenes antes de instalar. No cambiar la configuración global de npm ni ejecutar `audit fix --force`. Seguir luego `GUIA_DEMOSTRACION.md` para iniciar la interfaz. Con `lab_1` / `DemoConvoca2026!`, abrir `/admin/test-export` y descargar el catálogo; esa contraseña pertenece exclusivamente a los datos sintéticos públicos del piloto.

## 2. Matriz de amenazas

| Activo y amenaza | Impacto | Control y comprobación | Riesgo pendiente |
|---|---|---|---|
| PostgreSQL y archivos: ransomware | Pérdida o cifrado de datos | Copia identificada, checksum y restauración temporal del piloto; permisos separados | No se ejecutó malware. Una copia en el mismo equipo no reemplaza un respaldo externo/offline |
| API: abuso y DDoS | Indisponibilidad | Límites por IP, tamaño/complejidad acotados, HTTP 429 y recuperación; health excluido | Límites en memoria, por instancia; no frenan un DDoS volumétrico |
| Identidad: robo de credenciales | Suplantación | JWT sin clave predeterminada, algoritmo HS256, límites de login/2FA, logs sin cuerpo ni query | Revocación y rotación requieren intervención; token del cliente sigue expuesto ante XSS |
| SQL y entradas | Lectura/modificación indebida | Sequelize parametriza consultas; campos permitidos y escape de `%`/`_`; ensayo SQLi sin ampliar resultados | Detector de patrones es una señal, no un WAF ni prueba de ausencia de inyección |
| Autorización y asignación masiva | Escalada de rol o datos internos | CRUD de usuarios solo ORGANIZADOR; campos públicos/permitidos; ASISTENTE recibe 403 sin cambiar su rol | Revisar nuevos endpoints y permisos de dominio al incorporarlos |
| API/cookies/orígenes | Peticiones de otro sitio | CORS explícito y guardia de origen en escrituras con cookies/Origin; prueba 403 | HTTPS y política del navegador no sustituyen la autorización |
| Docker e infraestructura | Escalada, exposición o consumo excesivo | API como `node`, capacidades eliminadas, no-new-privileges, límites y puertos loopback; producción con raíz de solo lectura | Docker Engine y host deben mantenerse actualizados; no se realizó escaneo CVE de imágenes/host |
| Dependencias y suministro | Código vulnerable o sustituido | npm audit antes/después, lockfile e integridad, SheetJS oficial verificado, Actions fijadas por SHA, CI con permisos mínimos | Persisten avisos de herramientas de desarrollo; revisar antes de actualizar paquetes |
| n8n/webhooks | Automatización no autorizada o tormenta de tickets | Credencial A14 separada, lista de tipos/rutas, ventana temporal y deduplicación 15 min; webhook sin clave 403 | Caché no es una cola durable transaccional; pérdida de n8n o concurrencia puede exigir conciliación |
| IA | Filtración, prompt injection o acciones inventadas | A14 no usa modelos ni envía registros a IA; acciones críticas humanas y ejecutor A13 limitado | Si se incorpora IA: minimizar datos, tratar salidas como no confiables y exigir aprobación |

## 3. Vulnerabilidades y correcciones

Las auditorías guardadas corresponden al estado inicial del PR58 (`0502379`) y del frontend `develop` (`2c0de57`), comparados con sus correcciones. Los avisos dependen de la base de npm y pueden variar al repetirlos.

| Alcance comparable | Antes | Después |
|---|---:|---:|
| Backend, dependencias de ejecución | 4 (incluía 1 crítica) | 0 |
| Frontend, dependencias de ejecución | 9 (incluía 1 crítica) | 0 |
| Backend, incluyendo herramientas de desarrollo | 11 | 7 (6 altas, 1 moderada) |
| Frontend, incluyendo herramientas de desarrollo | No consolidado como JSON inicial | 13 altas |

Se actualizó bcrypt a 6, se corrigió uuid usado por Sequelize, Angular dentro de la versión mayor 22 y SheetJS a 0.20.3. Permanecen avisos en herramientas de desarrollo (entre ellas cadenas de glob/picomatch/minimatch); no se ocultaron con `--force` ni se declara riesgo cero. CI bloquea hallazgos altos/críticos **de ejecución**. El escaneo npm analiza dependencias; no es un pentest ni un escaneo del sistema operativo.

La revisión además corrigió: modificación de usuarios por un rol insuficiente, respuestas con campos sensibles, asignación de campos internos, confianza ambigua en proxies, registro de URL/query sensibles y notificación que ignoraba HTTP no exitosos. La configuración de Docker excluye `.env` y archivos privados del contexto de imagen. El guard de origen agrega protección para escrituras iniciadas desde otro sitio.

## 4. Pruebas y evidencias

Ver [evidencias/actividad14](evidencias/actividad14/README.md). Hay resultados JSON sanitizados y capturas **reales** del navegador, no imágenes generadas.

- **25/25 pruebas del backend**: regresiones de laboratorio y seguridad, con persistencia simulada donde se indica. Para ejecutarlas, CI provee `DATABASE_URL`, `DB_SSL=false` y un JWT exclusivo de prueba; no necesitan una base accesible. ESLint: cero errores y dos advertencias previas de una migración.
- **HTTP real contra Docker/PostgreSQL**: acceso sin sesión 401, rol incorrecto 403, rol conservado, listado sin campos sensibles, asignación masiva ignorada, comodines literales, sondeo SQL sin resultados adicionales, profundidad/claves reservadas 400, origen externo 403, rate limit 429, health 200 y recuperación al vencer la ventana.
- **Frontend**: 4/4 pruebas, build de producción, login real como organizador y descarga XLSX con 100 eventos. El smoke de SheetJS conserva texto que empieza con `=` sin convertirlo en fórmula.
- **Contenedor de producción**: health 200, usuario `node`, root de solo lectura; escritura de prueba rechazada con EROFS. Inspección de capacidades y contexto de imagen, sin credenciales incluidas.
- **n8n real**: cinco tipos de eventos de API registrados en Mantis y avisados localmente; evento repetido sin duplicar ticket y tipo inválido rechazado. Con Mantis detenido se ejecuta la rama de fallo; con SMTP detenido queda aviso pendiente. Al recuperar SMTP, repetir el mismo evento autenticado dentro de 15 minutos reenvía solo el correo. Ensayo comprobado: ticket 21, ejecuciones 209 y 211.
- **Recuperación**: backup y restauración en una base temporal, verificación de integridad y conteos 1.000/100/10.000. No reemplaza la base original ni ejecuta un ataque ransomware.

Para comprobar deduplicación y rechazo sin detener servicios:

```powershell
node scripts/probar-incidentes.js --caso duplicado
node scripts/probar-incidentes.js --caso invalido
```

Las variantes `fallo-mantis`, `fallo-smtp` y `recuperar-smtp` requieren detener/restaurar **solo el servicio del laboratorio**, con un `finally` que lo levante. No ejecutarlas contra una demostración compartida en uso. Los resultados detallados quedan en `infra/seguridad/resultados` (ignorado); publicar únicamente resúmenes sin tokens, cookies ni exportaciones crudas de n8n.

## 5. Respuesta y recuperación

Circuito: **API detecta → rechaza cuando corresponde → webhook autenticado → n8n valida/deduplica → ticket privado en Mantis → aviso en Mailpit**. Un patrón sospechoso solo genera una señal; claves reservadas, complejidad excesiva, falta de permisos y límites tienen rechazo efectivo. La emisión de señales se acota a 20/minuto y cuatro solicitudes simultáneas.

1. **Detectar y clasificar:** revisar evento, hora, ruta normalizada y ticket. Distinguir ensayo de incidente real y confirmar impacto; no copiar contraseñas, payloads privados ni tokens al informe.
2. **Contener:** los rechazos y límites actúan automáticamente. Ante compromiso confirmado, el responsable decide restringir acceso o revocar/rotar credenciales. No detener servicios, borrar datos ni restaurar bases automáticamente por una señal aislada.
3. **Corregir:** reproducir en el piloto, cambiar en una rama, agregar prueba pertinente y revisar el PR. Conservar evidencia antes/después y referencia al ticket.
4. **Recuperar:** verificar copia/checksum y restaurar primero en base temporal con aprobación explícita según A13. Comparar integridad y funcionalidad antes de cualquier reemplazo de datos reales.
5. **Verificar y cerrar:** repetir prueba controlada y comprobación funcional, revisar monitoreo y documentar resultado. Cerrar solo el ticket comprobado; no resolver incidencias históricas por asociación.

Si API → n8n falla, queda registro `SECURITY_DELIVERY` pendiente; no hay outbox durable en la API: el responsable debe conciliar/reemitir el evento. Si falla SMTP después de crear el ticket, reemitir dentro de la ventana conserva el ID y reenvía solo el aviso. Vencida la ventana, revisar Mantis antes de reenviar para evitar duplicados. Mantener volumen y clave de cifrado de n8n, restringir acceso y retención de ejecuciones.

## Fuentes

- [Express: proxies y confianza](https://expressjs.com/en/guide/behind-proxies/).
- [npm audit: alcance y resultados](https://docs.npmjs.com/cli/v11/commands/npm-audit/).
- [SheetJS: distribución oficial para Node.js](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).
- [Advisory uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) y [picomatch](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
