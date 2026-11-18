# Evidencias de A14

Ensayos locales del 18/11/2026 sobre las correcciones del PR58 y la rama frontend `fix/dependencias-seguridad-a14`. No son pruebas en producción ni un pentest completo. El piloto conserva 1.000 usuarios, 100 eventos y 10.000 inscripciones; el evento transitorio de ensayo se elimina.

| Archivo | Qué demuestra |
|---|---|
| `audit-backend-antes.json`, `audit-backend-despues.json` y equivalentes del frontend | Resultados originales de npm audit de ejecución: backend 4→0, frontend 9→0. Se incluyen archivos separados de herramientas de desarrollo con hallazgos pendientes |
| `logs-antes.json` | Reproducción del registro de query sensible del middleware original, usando únicamente un marcador sintético |
| `validacion-integrada.json` | HTTP real sobre API/PostgreSQL Docker, permisos, entradas, límite, recuperación, incidentes n8n/Mantis y bandeja local |
| `produccion.json` | Inspección Docker y escritura rechazada en raíz de solo lectura, no un escaneo CVE de imagen |
| `flujo-*.json` | Duplicación, entrada inválida, Mantis/SMTP detenidos y recuperación del aviso sin crear otro ticket |
| `recuperacion.json` | Respaldo identificado por SHA-256 y restauración en base temporal sin reemplazar datos originales |
| `navegador.json`, `frontend-validacion.json` | Login y descarga XLSX reales, más resultados de compilación y pruebas |
| `01` a `04` PNG | Capturas reales: reenvío n8n (211), ticket privado Mantis (21), aviso recuperado en Mailpit y pantalla de exportación Angular |

Los eventos de fallo se identifican como sintéticos. Mailpit es una bandeja local: no acredita entrega de correo externo. Las pruebas unitarias usan dobles donde corresponde; la validación HTTP y el navegador usan los servicios reales. No se publican contraseñas, cookies, exportaciones completas de ejecución ni copias de la base.

Reproducción y límites: [SEGURIDAD_A14.md](../../SEGURIDAD_A14.md).
