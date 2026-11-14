# A11: levantar Mantis y revisar las incidencias

Esta instalación permite que cada integrante reproduzca el trabajo desde el backend. **Mantis usa MariaDB en su propio Compose; Convoca sigue usando PostgreSQL.** No requiere iniciar la API, cargar seis millones de filas, tener PHP instalado ni conectarse a Tailscale.

## 1. Obtener la rama y arrancar

Requisitos: **Docker Desktop abierto con motor Linux, Git y Node.js 22.22.3 o superior**. Usar PowerShell en la raíz de `proybackendgrupo02`, donde está `package.json`.

Mientras PR #49 esté abierto, guardar los cambios propios y obtener esta rama:

```powershell
git fetch origin
git switch chore/gestion-incidencias
git pull --ff-only origin chore/gestion-incidencias
```

Después de integrar el PR, usar `develop` actualizado. No hace falta crear una tarea ni otra base de Convoca para levantar Mantis.

```powershell
npm run mantis:up
npm run mantis:validate
```

El primer comando genera **`infra/mantis/.env` con claves aleatorias** si no existe, construye la imagen, instala el esquema mediante el instalador oficial y registra el proyecto con diez tickets. La primera descarga/construcción requiere Internet y puede demorar varios minutos. No se necesita `npm ci` para estos comandos: el coordinador usa solo módulos incorporados de Node.

**Resultado esperado:** `10 tickets con responsable, categoría, prioridad, notas e historial verificados`. Abrir **http://localhost:8989**. MariaDB no publica puertos y la web solo escucha en `127.0.0.1`.

Si 8989 está ocupado por otra instalación, editar `MANTIS_PORT` en el archivo generado y volver a ejecutar `mantis:up`. No cambiar contraseñas de una base ya inicializada editando `.env`: el servidor conserva las originales. No compartir ni subir ese archivo.

## 2. Ingresar y ver el trabajo

Las claves están en **`infra/mantis/.env`**. Cada equipo genera las suyas; el nombre de usuario es el mismo.

| Integrante | Usuario | Variable de su contraseña |
|---|---|---|
| Gabriel | `gabriel-calisaya` | `MANTIS_GABRIEL_PASSWORD` |
| Mauro | `mauro-nanda` | `MANTIS_MAURO_PASSWORD` |
| Juan | `juan-carrizo` | `MANTIS_JUAN_PASSWORD` |
| Delia | `delia-cusipuma` | `MANTIS_DELIA_PASSWORD` |
| Dumbi34 | `dumbi34` | `MANTIS_DUMBI_PASSWORD` |

Entrar con el usuario propio y su clave; elegir **Convoca - A11 reproducible** y abrir **Ver incidencias**. Se ven diez tickets cerrados. Abrir uno: contiene problema, reproducción, tratamiento, vínculos, notas de verificación y el historial de estados. Gabriel figura como responsable de seguimiento y Mauro como autor de la nota de cierre de la validación automatizada.

**Qué significan los cierres:** son un registro retrospectivo de ensayos efectivamente verificados, importado por las APIs de Mantis. El historial muestra la importación actual, no fechas inventadas del hallazgo. Levantar Mantis **no vuelve a ejecutar fallas**. La prueba local de una corrección en la rama no afirma que esté mergeada ni desplegada en producción.

Los IDs locales iniciales son **1–10**. No confundirlos con los IDs **11–20 de la instancia histórica de Gabriel**. Esta instalación no borra ni suplanta sus veinte tickets. Las nuevas notas que agreguen aquí permanecen en su volumen local; no se sincronizan entre PCs a través de Git.

## 3. Qué se entrega y qué se verificó

- Catálogo revisado en [`infra/mantis/casos.json`](../infra/mantis/casos.json): diez incidentes, incluidas seguridad y rendimiento. Los antiguos controles de rechazo de datos ajenos, cargas simultáneas y versiones incompatibles no se cuentan como incidentes separados.
- Evidencia en [`evidencias/actividad11/`](evidencias/actividad11/README.md): regresiones antes/después, cortes reales en un laboratorio aislado, recuperación, planes y mediciones históricas A5, exportación de tickets y capturas de Chrome.
- El importador usa las APIs de Mantis para generar notas e historial; no inserta cierres directamente por SQL. Compara checksums de las evidencias antes de importar. Al repetir el arranque conserva los tickets existentes, incluso si el equipo los reabrió; no los duplica ni vuelve a cerrarlos.
- Código de MantisBT 2.28.4 fijado por commit/checksum, imágenes PHP/Composer/MariaDB fijadas por digest. Instalador web, API externa, registro público y envío de correo deshabilitados. Las claves no se incorporan a la imagen.

Para exportar el registro visible (sin usuarios, hashes, contraseñas ni sesiones):

```powershell
npm run mantis:export
```

Genera `infra/mantis/resultados/registro-exportado.json`. Es una evidencia del registro, **no un backup completo restaurable de MariaDB**. Para reproducir los diez casos iniciales en otro equipo alcanza el repositorio; los cambios posteriores propios se conservan en el volumen de este equipo.

## 4. Detener y volver a iniciar

```powershell
npm run mantis:stop
```

Conserva tickets, notas, usuarios y contraseñas. La próxima vez abrir Docker Desktop y ejecutar otra vez `npm run mantis:up`. No ejecutar `down -v` ni borrar el volumen para detenerlo.

Tailscale es una alternativa para consultar una instancia compartida y depende de autorización de su propietario. **No se necesita para este recorrido local reproducible.** La evidencia del acceso histórico de Gabriel se conserva por separado.

## Repetir las pruebas de falla (opcional)

Para abrir/ver los tickets no hay que ejecutar este apartado. Los ensayos sí detienen temporalmente servicios y requieren un laboratorio **nuevo y separado**, nunca la base normal del equipo.

1. Instalar las dependencias del backend con `npm ci`. Preparar `infra/hia/.env` desde su ejemplo con claves propias; usar `COMPOSE_PROJECT_NAME=convoca-lab-v2-a11audit`, `LAB_DB_PORT=15437`, `LAB_REPLICA_DB_PORT=15438`, `LAB_PGADMIN_PORT=15051` y agregar `API_PORT=13001`. No cambiar el archivo de un laboratorio cargado para convertirlo en otro: hacerlo en otro checkout limpio.
2. Desde ese checkout ejecutar, uno por uno:

```powershell
npm run lab:up
npm run lab:migrate -- --perfil piloto
node test/lab/integration.js
npm run lab:validate -- --perfil piloto
docker compose --env-file infra/hia/.env -f infra/compose.yaml up -d --build --wait
$env:A11_ALLOW_FAULTS='1'
node scripts/verificar-fallas-a11.js
Remove-Item Env:A11_ALLOW_FAULTS
node scripts/verificar-proxy-a11.js
```

`integration.js` se niega a ejecutarse si el piloto ya contiene datos; realiza la interrupción y reanuda la carga. No ejecutar `lab:seed` antes de esa prueba. Los otros ensayos liberan bloqueos y recuperan contenedores en `finally`; no cerrar por fuerza la terminal. El ensayo de proxy crea y retira únicamente sus contenedores/red de prueba con prefijo `convoca-a11-proxy-test`, usa puertos 18091/18092 y un backend HTTP mínimo. No es una prueba completa del frontend Angular.

Resultados en `infra/mantis/resultados/` y `infra/hia/resultados/`. Las mediciones de A5 no se reejecutan con estos comandos: se conserva su evidencia original y su alcance de laboratorio.

Fuentes técnicas: [instalación oficial de MantisBT](https://github.com/mantisbt/mantisbt/tree/release-2.28.4#installation) y [API de incidencias de la versión utilizada](https://github.com/mantisbt/mantisbt/blob/release-2.28.4/core/bug_api.php).
