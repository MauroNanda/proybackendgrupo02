# Evidencias A12

Resultados obtenidos contra Nextcloud real en Docker; las capturas provienen de Chrome con Playwright, sin reemplazar contenido de la página.

| Evidencia | Qué demuestra |
|---|---|
| `validacion.json` | Cuentas individuales, lectura/escritura, restricciones, SHA-256 y recuperación de V1 después de V2 |
| `instalacion-limpia.json` | Misma prueba sobre volúmenes nuevos, proyecto convoca-nextcloud-a12-limpio, puerto 8084 |
| `restauracion.json` | Respaldo cifrado recuperado en otro proyecto, hashes y permisos comprobados |
| `restauracion-permisos.json` | Veinte comprobaciones ejecutadas sobre la copia restaurada |
| `respaldo.json` | Registro del respaldo cifrado; excluye credenciales y contenido privado |
| `https.json` | Inicio de sesión real en navegador a través de HTTPS público temporal |
| `sincronizacion.json` | Edición remota conservada, conflicto detectado y entrega existente sin cambios |
| `capturas.json` | Procedencia y checksums de las cuatro capturas |

Los proyectos auxiliares se detuvieron después de las pruebas. No se usó la base de Convoca ni se eliminaron sus datos. La cuenta ajena existe solo para verificar el rechazo de acceso. Las operaciones negativas devolvieron 401, 403 o 404; no se confunde una carpeta ajena inaccesible con acceso permitido.

Las pruebas automatizadas por WebDAV cubren el circuito documental. `https.json` corresponde a un navegador automatizado desde el equipo de pruebas, atravesando el túnel público; no equivale a afirmar que todos los integrantes hayan ingresado desde sus dispositivos.

El informe y la guía exportados de Drive son material protegido de la instancia. No se adjuntan esos PDF ni los respaldos con credenciales al repositorio público. La matriz de permisos y el procedimiento reproducible están en [Nextcloud A12](../../nextcloud-a12.md).

Para repetir: Docker Desktop abierto → terminal en el backend → `node scripts/nextcloud.js up`, `sync` y `validate`. El script escribe resultados nuevos bajo `infra/nextcloud/resultados/`; estos archivos versionados conservan el ensayo documentado.
