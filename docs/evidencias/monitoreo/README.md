# Evidencias A10

Estos archivos corresponden a la validación local de las correcciones de backend #47 y frontend #24. No representan una prueba sobre Neon ni sobre la PC del resto del grupo.

- `01_grafana_real.png`: captura real de Chrome, dashboard aprovisionado; CPU, memoria, disco, red, contenedores, disponibilidad, PostgreSQL y réplica.
- `02_targets_reales.png`: captura real de Chrome, destinos de Prometheus.
- `03_validacion_integrada.json`: muestras reales de estado normal, base detenida (HTTP 503 y alertas firing), base recuperada, API detenida con PostgreSQL disponible y recuperación sin reiniciar frontend. Incluye número de series por panel y comprobación del rol no superusuario.
- `04_metricas_y_datos.json`: muestra de consulta activa lenta generada con `pg_sleep(30)`, réplica streaming y WAL, estado/reinicios del motor, salud tras recrear API y conteos finales del piloto.

Las imágenes son capturas de la interfaz, sin reconstruir resultados ni insertar valores en el DOM. Los JSON se obtuvieron de Prometheus, Grafana, la API y PostgreSQL. Las claves y variables privadas se excluyen. La fecha de las muestras y el commit base están en los archivos; las correcciones se probaron como cambios locales de las ramas indicadas.

Validación de configuración: `promtool check config` y cinco reglas válidas. Tests de laboratorio: 7/7 en Node 22 dentro de la imagen de API; lint sin errores, con dos advertencias anteriores en la migración de A5. La primera ejecución de tests en Windows con instalación sin scripts no pudo cargar bcrypt; se completó la comprobación en el entorno Linux del Dockerfile, que sí incluye el módulo nativo.

El dashboard y sus datos son operativos; durante reinicios o hasta el primer scrape puede haber paneles vacíos. Cero réplicas no indica sincronización. La consulta lenta representa actividad en curso, no historial de consultas terminadas. No hay envío externo de alertas configurado en A10: se consultan en Prometheus.
