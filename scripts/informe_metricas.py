#!/usr/bin/env python3
"""A13 - Flujo 3: lee metricas reales de Prometheus (A10), las analiza y arma un informe Markdown.

Solo usa la biblioteca estandar. Se ejecuta dentro de un contenedor python:3.12-alpine.
Codigos de salida: 0 informe generado; 2 datos incompletos (no se genera informe); 3 Prometheus inalcanzable.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

CONSULTAS = {
    "destinos_up": 'up',
    "api_disponible": 'probe_success{job="api-health"}',
    "postgres_up": 'pg_up',
    "conexiones_bd": 'sum(pg_stat_activity_count)',
    "disco_libre_pct": '100 * min(node_filesystem_avail_bytes{fstype!~"tmpfs|overlay|squashfs"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay|squashfs"})',
    "memoria_disponible_pct": '100 * node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes',
    "cpu_uso_pct": '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
}
REQUERIDAS = ["destinos_up", "api_disponible", "postgres_up"]
UMBRAL_DISCO = 10.0  # mismo umbral de A10: menos de 10 % libre


def consultar(base, expr):
    url = base.rstrip("/") + "/api/v1/query?" + urllib.parse.urlencode({"query": expr})
    with urllib.request.urlopen(url, timeout=15) as r:
        datos = json.load(r)
    if datos.get("status") != "success":
        raise RuntimeError("Prometheus respondio error")
    return datos["data"]["result"]


def valor(resultado):
    return float(resultado[0]["value"][1]) if resultado else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prom", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--a5", default=None, help="JSON opcional con mediciones de A5")
    ap.add_argument("--simular", choices=["incompleto"], default=None, help="solo para pruebas controladas")
    a = ap.parse_args()

    crudo = {}
    try:
        for nombre, expr in CONSULTAS.items():
            crudo[nombre] = consultar(a.prom, expr)
    except Exception as e:  # red, DNS, timeout, JSON invalido
        print(json.dumps({"ok": False, "error": "Prometheus inalcanzable: " + str(e)[:200]}))
        return 3

    if a.simular == "incompleto":  # prueba controlada de datos incompletos
        crudo["postgres_up"] = []
    faltantes = [n for n in REQUERIDAS if not crudo.get(n)]
    if faltantes:
        print(json.dumps({"ok": False, "error": "Datos incompletos: sin datos para " + ", ".join(faltantes)}))
        return 2

    destinos = {r["metric"].get("job", "?"): float(r["value"][1]) for r in crudo["destinos_up"]}
    caidos = sorted(j for j, v in destinos.items() if v < 1)
    api = valor(crudo["api_disponible"])
    pg = valor(crudo["postgres_up"])
    disco = valor(crudo["disco_libre_pct"])
    mem = valor(crudo["memoria_disponible_pct"])
    cpu = valor(crudo["cpu_uso_pct"])
    conex = valor(crudo["conexiones_bd"])

    alertas = []
    if caidos:
        alertas.append("Destinos caidos: " + ", ".join(caidos))
    if api is not None and api < 1:
        alertas.append("La API no responde al chequeo de salud")
    if pg is not None and pg < 1:
        alertas.append("PostgreSQL no disponible")
    if disco is not None and disco < UMBRAL_DISCO:
        alertas.append("Disco libre por debajo del %d %%" % UMBRAL_DISCO)
    estado = "ATENCION" if alertas else "NORMAL"

    def f(v, suf=""):
        return "sin dato" if v is None else ("%.1f%s" % (v, suf))

    ahora = datetime.now(timezone.utc)
    nombre = "informe-metricas-" + ahora.strftime("%Y%m%d-%H%M%S") + ".md"
    lineas = [
        "# Informe de metricas de Convoca",
        "",
        "Generado: " + ahora.strftime("%Y-%m-%d %H:%M:%S UTC") + " | Fuente: Prometheus (A10)",
        "",
        "**Estado general: " + estado + "**",
        "",
        "## Disponibilidad",
        "- Destinos de Prometheus: %d de %d en UP" % (sum(1 for v in destinos.values() if v >= 1), len(destinos)),
        "- API (chequeo de salud): " + ("disponible" if api and api >= 1 else "NO disponible"),
        "- PostgreSQL: " + ("disponible" if pg and pg >= 1 else "NO disponible"),
        "",
        "## Recursos (maquina virtual de Docker, no Windows completo)",
        "- Disco libre (minimo): " + f(disco, " %"),
        "- Memoria disponible: " + f(mem, " %"),
        "- CPU en uso (5 min): " + f(cpu, " %"),
        "- Conexiones a la base: " + f(conex),
        "",
        "## Alertas del analisis",
    ]
    lineas += ["- " + x for x in alertas] if alertas else ["- Sin condiciones anormales."]

    if a.a5:
        try:
            with open(a.a5, encoding="utf-8") as fh:
                a5 = json.load(fh)
            lineas += ["", "## Mediciones A5 incluidas", "- Entradas leidas: %d" % (len(a5) if hasattr(a5, "__len__") else 0)]
        except Exception:
            lineas += ["", "## Mediciones A5", "- No se pudo leer el archivo opcional; se omite."]

    lineas += ["", "Limites: son valores puntuales; no reemplazan el historial de Grafana ni miden SQL individual."]
    texto = "\n".join(lineas) + "\n"
    with open(a.out.rstrip("/") + "/" + nombre, "w", encoding="utf-8") as fh:
        fh.write(texto)
    print(json.dumps({"ok": True, "archivo": nombre, "estado": estado, "alertas": alertas,
                      "destinos": len(destinos), "caidos": caidos, "contenido": texto}))
    return 0


if __name__ == "__main__":
    sys.exit(main())