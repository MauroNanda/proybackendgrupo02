# Validación del laboratorio — actividad 4

Implementación **local**, rama `fix/laboratorio-postgresql`, sobre `develop` en `c5b64d5`. El script corregido ocupa la misma ruta `seeders/seed-masivo.sql`. No se modificó la base de Neon ni se inició la actividad 5.

## Resultado comprobado

| Perfil | Usuarios | Eventos | Inscripciones |
|---|---:|---:|---:|
| Piloto | 1.000 | 100 | 10.000 |
| Completo | 100.000 | 10.000 | 6.000.000 |

Datos sintéticos `convoca-v2.1`, PostgreSQL **17.11**, Docker **29.6.2**. Orquestación en Windows/Node **24.15.0**; instalación limpia, pruebas, lint y conexión API/CLI verificados también en Linux/Node **22.23.4** (misma versión mayor que CI).

El generador completo tardó **365,6 s**; el comando con estadísticas y validación tardó **408,7 s**. Son mediciones de este equipo, no tiempos garantizados para otros.

| Tabla | Datos | Total con índices y almacenamiento auxiliar |
|---|---:|---:|
| Usuarios | 13.434.880 bytes | 30.531.584 bytes |
| Eventos | 1.679.360 bytes | 2.121.728 bytes |
| Inscripciones | 702.177.280 bytes | 1.326.145.536 bytes |

Los 10.000 eventos reciben inscripciones: mínimo **333**, máximo **3.000**. Estados: **1.553.400 CONFIRMADO**, **2.046.300 ESPERA**, **875.700 CANCELADO** y **1.524.600 ASISTIO**.

## Pruebas realizadas

- Cinco pruebas de configuración/reglas: TLS remoto con certificados, conexión local, rechazo de contradicciones, perfiles/destinos, pares únicos y hashes bcrypt de demostración. Son pruebas de política SSL; no se abrió una conexión de prueba a Neon.
- Piloto real: rechazo de datos ajenos, interrupción después de confirmar un lote, avance atómico, rechazo de una segunda carga simultánea, reanudación, versión incompatible y repetición sin duplicados.
- Integridad de ambos perfiles: conteos exactos, claves foráneas, pares usuario/evento únicos, fechas/estados/cupos y conservación de índices de partida.
- Persistencia: se recreó el contenedor del principal con su volumen y el piloto conservó sus cantidades e integridad. También se comprobó el primer inicio en un volumen nuevo y se retiró únicamente ese entorno temporal.
- pgAdmin respondió **HTTP 200 / PING**. Principal y pgAdmin quedaron disponibles; réplica y backups programados permanecen desactivados.
- Backups y restauración de ambos perfiles: SHA-256, catálogo del dump, integridad del destino restaurado y comparación de conteos, restricciones y muestras. La base temporal restaurada se retiró al terminar.
- Retención del piloto: tras crear nuevas copias, se conservaron las dos más recientes y la última cuya restauración había sido verificada.
- pgBadger **12.0** generó reportes HTML reales a partir de los logs del servidor. Incluyen consultas de comprobación; no representan un ensayo de tráfico de usuarios.

## Copia completa verificada

`convoca_lab_v2-20261109T193945-1626.dump`: **586.397.191 bytes** (aproximadamente 559 MiB). Backup con validación: **94,8 s**; restauración y comparaciones: **132,8 s**. Conserva manifiesto, SHA-256 y marca `.verified.json` en `infra/hia/backups/`, fuera de Git.

Las ejecuciones originales quedan en `infra/hia/resultados/` con resultado, duración, versión, commit base y cambios locales; los comandos más recientes incorporan también hashes del código. El extracto legible por herramientas está en [validacion-laboratorio.json](./validacion-laboratorio.json). Estos archivos contienen resultados de ejecución; no son capturas de pantalla. No se generaron imágenes de evidencia.

## Qué falta para cerrar con el grupo

1. Otro integrante reproduce el piloto siguiendo [base-datos.md](./base-datos.md) y registra su resultado.
2. Confirmar con cátedra que acepta seis millones en `Inscripciones` y las otras dos tablas como apoyo; el enunciado exige seis millones por tabla del conjunto de prueba.
3. Commit/push y PR hacia `develop`, revisión del equipo y actualización final de Drive con estas mediciones. El remoto todavía conserva el script anterior hasta integrar el PR.

`npm ci` señaló 20 avisos de auditoría en las dependencias ya existentes. No se cambiaron versiones ni `package-lock.json` en este ajuste del laboratorio; su revisión queda separada de estas pruebas de datos.
