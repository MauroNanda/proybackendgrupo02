# Arquitectura final de Convoca para HIA

El diagrama inicial permanece en A1 del informe. Este esquema describe los componentes incorporados durante el trabajo.

```mermaid
flowchart TD
  navegador[Navegador]
  tunel[HTTPS temporal Cloudflare]
  front[Nginx y Angular compilado]
  api[API Express]
  db[(PostgreSQL principal)]
  replica[(PostgreSQL standby)]
  backup[Respaldo y restauracion temporal]
  prom[Prometheus y exportadores]
  grafana[Grafana]
  n8n[n8n]
  runner[Ejecutor local con operaciones permitidas]
  mantis[Mantis y su MariaDB]
  nc[Nextcloud y su base independiente]
  mail[Mailpit local]
  navegador --> tunel --> front
  front -->|proxy de API| api
  api --> db
  db -->|WAL asincrono| replica
  db --> backup
  prom -->|recoleccion| api
  prom -->|exportador| db
  grafana -->|consulta| prom
  n8n -->|consulta alertas| prom
  api -->|webhook autenticado de seguridad| n8n
  n8n --> mantis
  n8n --> nc
  n8n --> mail
  n8n -->|token y aprobacion cuando corresponde| runner
  runner --> backup
  runner -->|informe de metricas| prom
```

- La publicación expone la aplicación por Nginx; no requiere hacer pública la base ni las herramientas administrativas.
- La API usa el principal, no la réplica. No hay balanceo de lecturas ni failover automático.
- Prometheus recopila y Grafana visualiza; ninguna de esas herramientas modifica las inscripciones.
- Mantis y Nextcloud tienen persistencia propia. Su motor auxiliar no cambia PostgreSQL de Convoca.
- El runner restringe operaciones; n8n no recibe el socket Docker ni autorización para ejecutar cualquier comando.
- El recorrido de desarrollo permite Angular con `npm start`; el de publicación usa su imagen Nginx. Son alternativas de arranque, no dos frontends obligatorios simultáneos.
