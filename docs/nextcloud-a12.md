# A12 · Gestión documental con Nextcloud

Nextcloud reúne copias publicadas de los documentos, configuraciones y evidencias de Convoca. Drive conserva la edición del informe y la guía; Nextcloud permite consultar sus exportaciones y recuperar versiones. No aloja la base de datos de la aplicación.

## Arrancar en cualquier equipo

Abrir Docker Desktop y esperar que el motor esté listo. Abrir PowerShell en la carpeta del **backend**:

```powershell
git switch develop
git pull --ff-only
node scripts/nextcloud.js up
node scripts/nextcloud.js sync
node scripts/nextcloud.js validate
```

Requiere Node.js 22 o superior. No necesita instalar PHP, PostgreSQL ni paquetes npm. El primer arranque descarga imágenes e instala Nextcloud; puede tardar varios minutos. Si el puerto 8082 está ocupado, cambiar `NC_PORT` en `infra/nextcloud/.env` y repetir `up`.

Abrir **http://localhost:8082**. Las claves se generan en `infra/nextcloud/.env`, excluido de Git. Usar la cuenta propia, no el administrador:

| Integrante | Usuario | Clave local |
|---|---|---|
| Mauro | mauro-nanda | NC_MAURO_PASSWORD |
| Gabriel | gabriel-calisaya | NC_GABRIEL_PASSWORD |
| Juan | juan-carrizo | NC_JUAN_PASSWORD |
| Delia | delia-cusipuma | NC_DELIA_PASSWORD |
| Mauro Flores | dumbi34 | NC_DUMBI_PASSWORD |

`admin-convoca` administra el servidor. `archivo-convoca` conserva las publicaciones y comparte las carpetas. `prueba-ajena` es una cuenta de control sin acceso a las carpetas del grupo. Ninguna cuenta técnica sustituye a los integrantes.

## Qué encontrará el equipo

| Carpeta | Contenido | Grupo convoca-g02 |
|---|---|---|
| Convoca - Trabajo/Informe | Exportaciones del informe y guía, si fueron incorporadas por el responsable | Leer y editar |
| Convoca - Trabajo/Evidencias | Pruebas y capturas de las actividades | Leer y editar |
| Convoca - Trabajo/Configuraciones | Compose y plantilla de variables sin claves reales | Leer y editar |
| Convoca - Trabajo/Manuales | Arquitectura, base de datos, demostración e instructivos | Leer y editar |
| Convoca - Entregas/v-HASH | Copia identificada por su contenido y manifiesto SHA-256 | Solo lectura |

El grupo no puede volver a compartir. No se habilitan enlaces públicos. Las claves y los respaldos permanecen fuera de estas carpetas. `sync` usa una lista explícita de archivos; no copia el repositorio entero ni archivos `.env` reales. Si encuentra una edición remota distinta, informa el conflicto y la conserva. No sobreescribe silenciosamente. Cada cambio de contenido genera otra entrega.

### Matriz de permisos

| Perfil | Trabajo | Entregas | Administración |
|---|---|---|---|
| Cinco integrantes, grupo convoca-g02 | Leer, crear, editar y eliminar | Leer y descargar | No |
| archivo-convoca, propietario técnico | Control de sus archivos y publicaciones | Control de sus archivos y publicaciones | No |
| admin-convoca | Soporte del servidor | Soporte del servidor | Sí |
| prueba-ajena | Sin acceso | Sin acceso | No |
| Anónimo | Sin acceso | Sin acceso | No |

## Incorporar las exportaciones de Drive

El responsable descarga los dos documentos como PDF en `infra/nextcloud/resultados/fuentes/` y registra `manifest.json` como lista con `file`, `documentId`, `revisionId` y `exportedAt`. Luego ejecuta `node scripts/nextcloud.js sync`. Las exportaciones y las claves no se suben a Git. El manifiesto de cada entrega identifica archivos, tamaños y hashes; los documentos de Drive mantienen su procedencia.

## Comprobarlo desde la interfaz

1. Ingresar con la cuenta propia y abrir **Archivos → Compartidos contigo**.
2. En **Convoca - Trabajo**, abrir un manual y subir un archivo de prueba.
3. Ingresar con otra cuenta del grupo: debe poder descargar ese archivo.
4. En **Convoca - Entregas**, abrir una entrega: debe permitir descargar, pero no subir ni eliminar.
5. En Trabajo, modificar un archivo de texto. Abrir su menú **Detalles → Versiones**, elegir una versión anterior y restaurarla.

La prueba automatizada reproduce estas operaciones por WebDAV, compara SHA-256 y guarda el resultado en `infra/nextcloud/resultados/validacion.json`. También verifica accesos anónimos, una cuenta ajena y rutas conocidas de otro usuario.

## Respaldar y probar una restauración

```powershell
node scripts/nextcloud.js backup
node scripts/nextcloud.js restore-test
```

El respaldo pausa cron y activa mantenimiento durante la copia. Incluye base, configuración, documentos, versiones y aplicaciones personalizadas. Cifra los archivos y los metadatos con AES-256-GCM en `infra/nextcloud/backups/`. Guardar `archivos.enc`, `nextcloud.enc` y la clave local en un lugar seguro; conservar la clave por separado. Ninguno se versiona en Git. No publicar esta carpeta en Nextcloud.

`restore-test` usa volúmenes **nuevos** del proyecto `convoca-nextcloud-a12-restauracion`, puerto 8083. Restaura las cuentas y documentos, repite las pruebas de permisos/versiones y verifica los hashes de la entrega. Al terminar detiene esa copia y conserva el original. Si ya existen volúmenes de restauración, se detiene para no pisarlos: no borra datos automáticamente. La copia de prueba conserva las claves del respaldo; no es otra instancia compartida.

Para recuperar en otra máquina, clonar la misma revisión del backend, copiar los dos archivos cifrados y la clave a `infra/nextcloud/backups/` y ejecutar `restore-test` con Docker Desktop abierto. No necesita el `.env` original: la configuración está dentro del respaldo cifrado. Una vez validada, la copia se inicia con `docker compose --env-file infra/nextcloud/backups/restauracion.env -f infra/nextcloud/compose.yaml up -d` y se abre en http://localhost:8083. El comando `backup` reemplaza la copia local anterior; conservar aparte los respaldos que se quieran retener.

## Instancia compartida y copias locales

El servidor del responsable es el espacio común del grupo. Una instalación en otro equipo crea una copia independiente, no sincroniza automáticamente las cuentas ni documentos de la instancia común. Para trabajar juntos se utiliza la URL HTTPS comunicada al grupo y sus credenciales individuales, entregadas por un canal privado. Una URL temporal deja de funcionar al cerrar el túnel.

Con `cloudflared` instalado, el responsable abre otra terminal y mantiene este proceso activo:

```powershell
cloudflared tunnel --url http://127.0.0.1:8082 --no-autoupdate
```

Copiar la URL `https://...trycloudflare.com` que imprime y autorizar ese dominio en otra terminal del backend:

Se usa `127.0.0.1` explícitamente: Docker publica este servicio solo en IPv4. Usar `localhost` puede resolver a `::1` y provocar un 502 en Cloudflare.

```powershell
node scripts/nextcloud.js public-url https://DOMINIO-IMPRESO.trycloudflare.com
```

La URL permite llegar al inicio de sesión; no da acceso anónimo a documentos. Usar solo claves individuales, nunca la de administración. Al cerrar `cloudflared` con Ctrl+C se retira el acceso remoto. Al reabrirlo, repetir `public-url` con el nuevo dominio. No hace falta levantar Convoca ni modificar su configuración HTTPS.

## Detener y volver a usar

```powershell
node scripts/nextcloud.js stop
node scripts/nextcloud.js up
```

Se conservan los volúmenes de PostgreSQL y Nextcloud. No ejecutar `docker compose down -v`: elimina los datos. El servicio cron procesa las tareas en segundo plano; Redis coordina caché y bloqueos. Ambos quedan internos en Docker.

## Fuentes

- [Imagen oficial](https://github.com/nextcloud/docker)
- [Versiones por WebDAV](https://docs.nextcloud.com/server/34/developer_manual/client_apis/WebDAV/versions.html)
- [Respaldo](https://docs.nextcloud.com/server/34/admin_manual/maintenance/backup.html)
