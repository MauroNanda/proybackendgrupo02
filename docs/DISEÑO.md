# Diseño Visual — Convoca (Design System)

> **Paleta:** "Arctic Reflection" adaptada con gris slate, accent azul primary y semánticos.
> **Tipografía:** Space Grotesk (headings) + Inter (body).
> **Iconos:** Bootstrap Icons (sin emojis en templates).

## Paleta de Colores

| Rol | Color | Hex | Uso |
|-----|-------|-----|-----|
| Primary | Azul medio | `#5289AD` | Botones principales, logos, links activos |
| Primary Dark | Azul profundo | `#243C4C` | Sidebar admin, fondos oscuros, hover states |
| Accent / CTA | Ámbar cálido | `#E8A838` | Botones destacados secundariamente, badges |
| Background | Slate ultra claro | `#F1F5F9` | Fondo general de la app (light mode) |
| Surface / Cards | Slate / Gris frío | `#E2E8F0` | Fondo de hero, buscador, y áreas agrupadas |
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

*   **Cards:** `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,.04)`, background `#FFFFFF`, borde sutil.
*   **Botones primarios:** `bg: #5289AD`, `color: #fff`, `border-radius: 8px`, hover color adjust.
*   **Inputs:** `border: 1px solid #ACBCBF`, `border-radius: 8px`, focus box-shadow sutil.
*   **Buscador central:** `bg: #E2E8F0` sin borde, input-group estilizado tipo Notion.

## Layouts

### Vista Asistente (public-layout)
*   Navbar blanca con logo, buscador central gris integrado con lupa, campana de notificaciones con dot rojo sutil, y botones de Ingresar/Registrarme.
*   Footer institucional de color blanco, alineado de manera fija a la base del viewport.

### Vista Organizador (admin-layout)
*   Sidebar izquierda fija (ancho 240px), fondo `#243C4C`, texto blanco, con subsecciones de navegación ("General", "Gestión", "Análisis") y avatar genérico en la base.
*   Área de contenido principal con fondo `#F1F5F9`.

## Archivos del Design System

| Archivo | Propósito |
|---------|-----------|
| `src/styles/_variables.scss` | Overrides de Bootstrap + tokens propios |
| `src/styles.scss` | Import de variables + Bootstrap + Bootstrap Icons + globales |
| `src/index.html` | Link a Google Fonts |
| `layouts/public-layout/` | Navbar + footer con diseño aplicado |
| `layouts/admin-layout/` | Sidebar + header con diseño aplicado |

