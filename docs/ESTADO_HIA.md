# Estado técnico de HIA y defensa

Revisión: 16/11/2026. Backend `develop` **787a1d4**; frontend `develop` **2c0de57**. El estado técnico siguiente se contrastó con la consigna del TP integrador, ambos repositorios, Drive, el tablero y GitHub Actions. No modifica el estado de las tarjetas ni reemplaza las evidencias originales.

**[Guía técnica y defensa en Drive](https://docs.google.com/document/d/1L3x7irOQPf3UPhPXYKQznzqA3SrbL3chfSbW9axVdhg)**: fichas por actividad, decisiones, código enlazado a commits concretos, preguntas de defensa y pendientes. No contiene contraseñas ni datos del registro privado.

## Cómo iniciar

Usar [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md). Abrir Docker Desktop primero; ejecutar los comandos en PowerShell dentro del repositorio indicado.

- **A, inicio rápido:** conserva `infra/hia/.env`, imagen de API, dependencias y volúmenes con el piloto ya migrado/cargado. Levantar Compose y Angular; comprobar `/api/health`. Reconstruir la API si cambió su código o Dockerfile.
- **B, desde cero:** instalar dependencias, generar configuración local, levantar base, aplicar migraciones, cargar y validar piloto, construir API e iniciar frontend.
- Sin volúmenes/datos anteriores, el inicio rápido no recupera información. Elegir instalación limpia o restauración del respaldo.

El recorrido sencillo combina API/base en Docker y frontend en Node. Para acreditar A7 con ambos componentes en contenedores, mostrar también el Dockerfile y Compose del frontend. La publicación requiere su red externa, base accesible y configuración propia; el Compose de producción de la API no crea la base.

## Estado contrastado

“Evidencia previa” identifica ensayos documentados; no implica que se hayan repetido hoy. El tablero puede estar terminado y conservar pendientes de integración o acreditación.

| Actividad | Implementación y evidencia | Límite o pendiente |
|---|---|---|
| 1. Diagnóstico | Descripción, inventario, arquitectura inicial y funcionalidades en Drive/docs. | Conservar el diagrama inicial separado de la arquitectura Docker final. |
| 2. Scrum | GitHub Projects, backlog, responsables y sprints. | Los estados no acreditan por sí solos reuniones o pruebas técnicas. |
| 3. Git | PR obligatorios para main/develop en ambos repositorios. | Aprobaciones obligatorias: 0. Diferenciar pauta de revisión y bloqueo técnico. |
| 4. Base y backup | PostgreSQL, pgAdmin, piloto, carga reanudable, pgBadger y restauración con evidencia previa. | Solo Inscripciones alcanza 6 M; Usuarios/Eventos son apoyo. Delimitar con la cátedra el alcance de las tablas de prueba. |
| 5. SQL | Ocho casos medidos; índices y varias optimizaciones integrados. | Dos consultas del dashboard todavía usan COUNT(id). No presentar las ocho propuestas como totalmente integradas. |
| 6. Réplica | Standby físico asíncrono, propagación y recuperación ensayados. | No hay failover automático; la prueba con la réplica caída no demuestra caída del principal. |
| 7. Docker | Imágenes de API/frontend y variantes Compose. | Diferenciar desarrollo con Angular en Node de demostración con ambos en Docker. |
| 8. CI/CD | CI frontend con build/tests/imagen; backend con instalación/lint en main. | No se observa deploy automático ni rollback en los workflows actuales. Hay afirmaciones de Drive que necesitan evidencia o implementación. |
| 9. Publicación | Proxy Nginx y túnel HTTPS con evidencia previa de acceso externo. | La URL es temporal y debe renovarse/probarse para la defensa. |
| 10. Monitoreo | Exportadores, dashboard, alertas y evidencia versionada. | Métricas agregadas no equivalen al registro de cada SQL. |
| 11. Incidencias | Mantis reproducible y diez casos retrospectivos con evidencias. | Importarlos no vuelve a ejecutar diez fallas; su API externa está bloqueada. |
| 12. Documentos | Nextcloud, permisos, versiones, respaldo y acceso remoto comprobados previamente. | Cuentas simplificadas/política de laboratorio requieren revisión de seguridad; no incluir claves en documentación pública. |
| 13. n8n | Propuesta detallada en la guía y tarjeta #37. | Sin despliegue ni flujos de Convoca en los develop revisados; pendiente. |
| 14. Seguridad | Controles de aplicación/configuración y regresiones parciales. | Faltan matriz, escaneos/correcciones, respuesta y flujo de incidentes integrado. |
| 15. Entrega | Manuales, informe parcial y esta guía de defensa. | A13–A15 del informe siguen sin desarrollo; falta cierre y ensayo grupal. |

La consigna exige **al menos 6.000.000 registros por tabla de datos del conjunto de prueba**. El manifiesto actual configura 100.000 usuarios, 10.000 eventos y 6.000.000 inscripciones, no seis millones en cada una. La diferencia debe explicitarse, sin alterar datos durante esta revisión documental.

## Qué se verificó en esta revisión

- Nueve pruebas locales de `test/lab`: 9/9 aprobadas, con variables ficticias y sin acceso a la base real.
- ESLint sin errores; dos advertencias previas de parámetros Sequelize no usados.
- Comparación de los 17 archivos ejecutables/configuraciones comentados: mismo AST JavaScript, mismo YAML y mismas instrucciones de SQL, shell, PHP y Dockerfile.
- Los cinco Compose conservan la misma configuración resuelta antes/después: valores, servicios, redes, puertos, volúmenes y dependencias.
- Referencias GitHub comprobadas sobre los commits indicados; backend y frontend revisados sin modificar el frontend.

No se ejecutaron carga masiva, migraciones, recreación de contenedores, restauraciones ni pruebas externas nuevas. Docker Desktop estaba apagado. `npm test` solo imprime un marcador; no se utilizó como prueba. Se ejecutó `node --test test/lab/*.test.js` con una URL ficticia para los tests que cargan configuración.

Los checksums y capturas históricos permanecen asociados a sus ensayos originales. Los comentarios nuevos cambian bytes del código, no su lógica; no se reescribieron las evidencias para aparentar una ejecución nueva.

## Prioridades para la presentación

1. Completar o respaldar CD/rollback de A8 y delimitar la interpretación del volumen de A4.
2. Implementar A13 con A4/A10/A11/A12; preparar acceso interno autenticado a Mantis.
3. Completar A14, incluido el riesgo de los accesos de laboratorio y las automatizaciones.
4. Integrar las dos propuestas restantes de A5 cuando se tome esa tarea; no mezclarlas en este PR documental.
5. Completar A15: ensayo reproducible en otro equipo, acceso externo vigente y reparto de la defensa de aproximadamente veinte minutos.

Esta rama solo agrega documentación, comentarios e instrucciones. No cambia configuraciones, lógica, dependencias ni credenciales. El PR debe permanecer abierto para revisión.
