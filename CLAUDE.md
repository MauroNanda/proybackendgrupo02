# Convoca - Proyecto Final PysWeb (UNJu)

> **Regla para agentes IA:** Antes de escribir cualquier línea de código, lee `docs/BITACORA.md` (estado actual), `docs/PLAN-DE-TAREAS.md` (qué tarea hay disponible y qué archivos tocar), `docs/PROPUESTA.md` (qué se está construyendo), `docs/CONSIGNA-TP-FINAL.md` (requisitos formales) y `docs/FLUJO_DE_TRABAJO.md` (cómo trabajar en rama y commitear).

## Información General
*   **Materia:** Programación y Servicios Web (Facultad de Ingeniería, UNJu).
*   **Equipo:** Grupo G02 — 5 integrantes.
*   **Repositorios (2 separados, exigido por la cátedra):**
    *   Backend: https://github.com/MauroNanda/proybackendgrupo02
    *   Frontend: https://github.com/MauroNanda/proyfrontendgrupo02

## Stack Tecnológico
*   **Frontend:** Angular 22 (Standalone Components, Signals), Bootstrap 5, Formularios Reactivos.
*   **Backend:** Node.js + Express (Arquitectura MVC con capa de Servicios).
*   **Base de Datos:** PostgreSQL con Sequelize (ORM), alojada en Neon.tech.
*   **Seguridad:** JWT, bcrypt, OAuth 2.0 (Google), 2FA, prevención XSS/CSRF, auditoría.
*   **APIs Externas:** Google OAuth, Telegram Bot, Discord Bot, Resend (Email), Google Calendar, Web Push.

## Índice de Documentación (`docs/`)
| Archivo | Propósito | Cuándo leerlo |
|---|---|---|
| `docs/CONSIGNA-TP-FINAL.md` | Consigna oficial de la cátedra. | Para validar que se cumplen los requisitos. |
| `docs/PROPUESTA.md` | Alcance del proyecto, features, flujos e integraciones. | Para saber **qué** se construye. |
| `docs/ARQUITECTURA.md` | Esquema de BD, estructura MVC del Backend y del Frontend. | Para saber **cómo** está organizado el código. |
| `docs/CONVENCIONES.md` | Reglas de código: estilo, comentarios, patrones. | Antes de escribir o revisar código. |
| `docs/FLUJO_DE_TRABAJO.md` | Estrategia de ramas, commits, PRs, reglas del equipo. | Antes de empezar cualquier tarea. |
| `docs/PLAN-DE-TAREAS.md` | Tareas listadas por fase y dominio, con archivos a tocar y criterios. | Al elegir una tarea para tomar. |
| `docs/SETUP.md` | Guía paso a paso para levantar el proyecto. | Al clonar los repos por primera vez. |
| `docs/BITACORA.md` | Estado actual, decisiones tomadas, changelog. | **Siempre primero.** |
