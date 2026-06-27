# Diseño Visual — Convoca (Design System)

> **Paleta:** "Arctic Reflection" adaptada con accent ámbar y colores semánticos.
> **Tipografía:** Space Grotesk (headings) + Inter (body).

## Paleta de Colores

| Rol | Color | Hex | Uso |
|-----|-------|-----|-----|
| Primary | Azul medio | `#5289AD` | Botones principales, navbar, links activos |
| Primary Dark | Azul profundo | `#243C4C` | Sidebar admin, fondos oscuros, hover states |
| Accent / CTA | Ámbar cálido | `#E8A838` | Botones de acción ("Inscribirme"), badges destacados |
| Background | Casi blanco | `#F4FCFB` | Fondo general de la app (light mode) |
| Surface / Cards | Gris claro | `#E8F0F1` | Cards, contenedores, áreas agrupadas |
| Text Dark | Slate oscuro | `#1A2E38` | Texto principal (body, headings) |
| Text Muted | Gris medio | `#698696` | Texto secundario, labels, captions |
| Border | Gris borde | `#ACBCBF` | Bordes de inputs, separadores, divisores |
| Success | Verde | `#22C55E` | Estados exitosos, badges "ASISTIÓ" |
| Danger | Rojo | `#EF4444` | Errores, badges "CANCELADO", botones destructivos |
| Warning | Amarillo | `#F59E0B` | Alertas, badges "EN ESPERA" |
| Info | Celeste | `#3B82F6` | Notificaciones informativas, tooltips |

## Tipografía

*   **Headings (h1–h3):** Space Grotesk — 700/600/500
*   **Body, labels, captions:** Inter — 400/500/600
*   **Tamaños:** Display 48px · h1 36px · h2 24px · h3 20px · body 16px · caption 14px · small 12px

## Espaciado

Base: 4px. Escala: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

## Componentes Base

*   **Cards:** `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,.08)`, background `#FFFFFF`, borde `#ACBCBF`.
*   **Botones primarios:** `bg: #5289AD`, `color: #fff`, `border-radius: 8px`, hover `#3F7394`.
*   **Botones accent:** `bg: #E8A838`, `color: #1A2E38`, `border-radius: 8px`, hover `#D49530`.
*   **Inputs:** `border: 1px solid #ACBCBF`, `border-radius: 8px`, focus `border-color: #5289AD`.
*   **Badges/Tags:** `border-radius: 20px`, padding `4px 12px`, font-size `12px`.

## Layouts

### Vista Asistente (public-layout)
*   Navbar blanca con logo + búsqueda + campana + avatar.
*   Footer institucional.
*   Contenido centrado, max-width 1200px.

### Vista Organizador (admin-layout)
*   Sidebar izquierda fija (ancho 240px), fondo `#243C4C`, texto blanco.
*   Área de contenido con fondo `#F4FCFB`.
*   Items del sidebar: iconos + texto, estado activo con accent lateral.

## Archivos del Design System

| Archivo | Propósito |
|---------|-----------|
| `src/styles/_variables.scss` | Overrides de Bootstrap + tokens propios |
| `src/styles.scss` | Import de variables + Bootstrap + globales |
| `src/index.html` | Link a Google Fonts |
| `layouts/public-layout/` | Navbar + footer con diseño aplicado |
| `layouts/admin-layout/` | Sidebar + header con diseño aplicado |
