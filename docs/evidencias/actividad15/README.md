# Comprobaciones de cierre A15

Ensayo sobre una **instalación nueva y aislada en la misma computadora**, sin borrar volúmenes existentes ni repetir la carga completa. No equivale a reproducción independiente de otro integrante ni a un ensayo oral grupal.

- `comentarios-equivalencia.json`: 30 archivos de ambos repositorios comparados con sus commits base. AST JavaScript/TypeScript o instrucciones sin comentarios; ninguna instrucción del código original cambia.
- `reproduccion.json`: operaciones verificadas de migración, carga del piloto, backup/restauración y réplica.
- `ensayo-local.json`: navegador y HTTP reales, login con dos roles, evento sintético, inscripción, QR, asistencia, permisos y retiro de la fixture.
- `ensayo-https.json`: mismo circuito por la URL HTTPS temporal, cuando la prueba haya finalizado correctamente. Origen de la comprobación: esta computadora, no un teléfono de otro integrante.
- `validacion-documental.json`: revisión de los 16 apartados obligatorios, archivos y referencias del cierre.

Durante la edición, la herramienta de comentarios convirtió shell a CRLF y el primer ensayo de respaldo lo detectó. Se restableció LF, conservando la política `.gitattributes` existente, y se repitió con éxito. No fue necesario cambiar el procedimiento de respaldo. La copia real queda privada; aquí se publica únicamente el resultado y su hash.

`01_aplicacion_https.png` es una captura del navegador real. `02_arquitectura_final.png` es un diagrama documental elaborado a partir de las configuraciones, no una captura de una interfaz. No se publican cookies, tokens, contraseñas ni dumps de bases. La evidencia previa de A1–A14 conserva su fecha original; no se presenta como una ejecución nueva.
