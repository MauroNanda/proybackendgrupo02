# A11 — Gestión de incidencias: entrega revisada

## Resultado

Se incorporó una instalación reproducible de **MantisBT 2.28.4 + MariaDB**, separada del PostgreSQL de Convoca. Desde la raíz del backend: `npm run mantis:up` y `npm run mantis:validate`. El procedimiento completo, usuarios y claves locales están en [mantis-a11.md](../../mantis-a11.md).

El proyecto **Convoca - A11 reproducible** contiene diez incidentes con reproducción, categoría, prioridad, responsable, tratamiento, vínculos a cambios, dos notas e historial de asignación → resolución → cierre. El seguimiento figura a cargo de Gabriel y la nota de verificación automatizada/cierre a nombre de Mauro. Es una **importación retrospectiva identificada**, no una recreación de fechas ni una afirmación de ejecución original por Gabriel.

## Diez incidentes y evidencia

| ID | Incidente | Tratamiento y comprobación |
|---|---|---|
| A11-01 | Descripción opcional provoca error al crear evento | Se normaliza a cadena vacía. [Regresión antes/después](pruebas/regresiones.json) y [suite 9/9](pruebas/suite-node.txt). Corrección de Gabriel en PR #49. |
| A11-02 | Stack interno expuesto en errores de desarrollo | Se elimina del JSON y se conserva en logs. [Regresión con el código anterior y actual](pruebas/regresiones.json). Seguridad en laboratorio; no se afirma exposición productiva. |
| A11-03 | Bloqueo exclusivo retrasa el catálogo | Lectura esperando un lock real; liberación y recuperación: **2.031 ms → 16 ms**, ambos HTTP 200 y mismo tamaño de respuesta. [Operación](pruebas/operacion.json). |
| A11-04 | Health devolvía 200/ok con base caída | Defecto corregido en A10: [antes 200/ok y después 503/down](pruebas/regresiones.json). Se repitió el corte real de la base: [503 durante el corte y 200 tras recuperar](pruebas/operacion.json). |
| A11-05 | Proxy conserva la IP antigua tras recrear API | Regresión aislada Docker DNS: proxy anterior **504**, proxy dinámico **200** sin reiniciar Nginx. [Prueba y límites](pruebas/proxy.json); solución integrada en frontend PR #25. |
| A11-06 | Sesión de carga interrumpida deja trabajo parcial | Se terminó realmente la sesión, se comprobó avance atómico y se reanudaron los lotes sin duplicar. [Nueva repetición del ensayo A4](pruebas/integracion-piloto.json). |
| A11-07 | API detenida deja inaccesible el backend | Petición fallida con la API detenida mientras PostgreSQL sigue disponible; reinicio y HTTP 200. [Operación](pruebas/operacion.json). |
| A11-08 | Standby detenido deja de recibir cambios | Cero standbys durante el corte; un registro de prueba llega tras reiniciar; lectura directa confirma recuperación, `streaming` y limpieza propagada. [Réplica](pruebas/replica.json). |
| A11-09 | JOIN del catálogo penaliza la carga masiva | Evidencia histórica A5, caso 07: **5.330,062 → 3.176,417 ms**, resultados equivalentes con `separate:true`. [Planes y resultados originales](pruebas/ocho-probados.json). |
| A11-10 | Agregación mensual realiza trabajo innecesario | Evidencia histórica A5, caso 05: **276,302 → 154,735 ms**, siete meses y resultados equivalentes con `COUNT(*)` e índice de fecha. [Planes y resultados](pruebas/ocho-probados.json). Cierre del ensayo, sin afirmar integración productiva del dashboard. |

Los incidentes operativos provocados se identifican como tales: no son defectos espontáneos. Los rechazos correctos de datos ajenos, concurrencia y versiones incompatibles se mantienen como controles de A4 y **no se cuentan como tres incidentes**. Los nuevos A11-04, 05 y 07 sustituyen esas tres filas del catálogo anterior; no son los mismos tickets históricos de Gabriel.

## Capturas y trazabilidad

- [Listado completo de los diez tickets cerrados](capturas/01_listado_mantis.png).
- [Detalle del incidente de seguridad, notas e historial](capturas/02_detalle_seguridad.png).
- [Exportación consultada por API interna de Mantis](pruebas/mantis.json), con responsables, prioridades, notas, autores y transiciones. No contiene usuarios completos, hashes, contraseñas ni sesiones.
- [Comprobación real de navegador](pruebas/interfaz.json): login, listado, detalle, CSS y bloqueo del instalador/API externos.
- [Checksums de las evidencias y catálogo](manifest.json). Se verifican antes de importar los tickets.

Las dos imágenes se capturaron desde Chrome con sesión real; no se generaron ni se reemplazaron textos del DOM. El script de captura no se distribuye con contraseñas. Los IDs iniciales de esta instalación son 1–10; los 11–20 del registro previo pertenecen a otra instancia.

## Alcance de la validación

Pruebas actuales realizadas el **14/11/2026**, desde la rama `chore/gestion-incidencias`, sobre el commit base `f40dfeb` más los cambios locales de esta corrección. No se presentan como mediciones de un commit posterior ni como pruebas en Neon/producción.

- API Node 22.22.3 y PostgreSQL 17 en proyecto nuevo `convoca-lab-v2-a11audit`: piloto exacto de 1.000 usuarios, 100 eventos y 10.000 inscripciones. Se retiró la tabla temporal de réplica y su eliminación se propagó.
- Regresiones de código aisladas sin red; persistencia sustituida para el servicio de eventos. Suite 9/9 en contenedor con el binding Linux de bcrypt. Un primer intento montando `node_modules` de Windows falló y fue descartado; la ejecución válida usa las dependencias Linux de la imagen de la API.
- Mantis instalado desde cero en un tercer proyecto de prueba tras corregir un fallo de caché de contraseña inicial; arranque completo y validación de diez tickets en una sola secuencia. No se da como válida la primera instalación fallida.
- Persistencia e idempotencia: el registro consultado fue idéntico antes y después de `stop`/`up`; sin duplicación de tickets, notas ni historial.
- Las mediciones masivas A5 son evidencia histórica del equipo, extraída sin cambiar resultados de los casos 05 y 07. **No se reejecutó esa carga ni se atribuye su ejecución original a Gabriel.**

Los cierres acreditan el tratamiento/verificación de los ensayos y correcciones en la rama. No equivalen al merge del PR #49, a un despliegue en producción ni a la aprobación de la cátedra. El acceso desde otra PC real del equipo aún requiere que esa persona ejecute la guía; la repetición automatizada con una base nueva acredita reproducibilidad técnica, no esa prueba humana.

## Antecedentes conservados

Los archivos `actividad11-*.txt`, el registro histórico y `mantis-local-login.png` conservan lo enviado por Gabriel antes de esta corrección. La evidencia de Tailscale describe su instancia compartida anterior y no es un requisito de la instalación local. No se borraron ni modificaron los tickets de aquella instancia.
