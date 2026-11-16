# Guía de Instalación y Setup (Convoca — Grupo G02)

Para el laboratorio y la presentación de HIA, usar [la guía central](GUIA_DEMOSTRACION.md): separa instalación completa e inicio rápido, conserva los datos y no requiere Neon. Este documento conserva la alternativa original de API en el host con una base ya disponible.

> El proyecto usa dos repositorios independientes, backend y frontend. No mezclar las configuraciones de esta alternativa con las de `infra/hia/.env`.

## Repositorios
*   **Backend:** https://github.com/MauroNanda/proybackendgrupo02
*   **Frontend:** https://github.com/MauroNanda/proyfrontendgrupo02

## Requisitos Previos
*   **Node.js 22.22.3 o superior**, según los requisitos actuales del frontend.
*   **Git** instalado.
*   **PostgreSQL accesible** y configurado en el `.env` de la API. Puede ser el destino original en Neon; el recorrido HIA utiliza PostgreSQL en Docker.

---

## 1. Clonar los repositorios
```bash
git clone https://github.com/MauroNanda/proybackendgrupo02.git
git clone https://github.com/MauroNanda/proyfrontendgrupo02.git
```

## 2. Setup del Backend
1. Entrar a la carpeta del backend:
   ```bash
   cd proybackendgrupo02
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   * En la raíz del proyecto, busca el archivo `.env.example`.
   * Cópialo y renómbralo a **`.env`**.
   * Completa las variables con los datos de la sección "Datos de Conexión" de este documento.
   * **¿Por qué `.env`?** Es un archivo que guarda contraseñas y configuraciones sensibles. Está bloqueado por `.gitignore` para que nunca se suba a GitHub.
4. Correr Migraciones (para crear las tablas en la BD):
   ```bash
   npx sequelize-cli db:migrate
   ```
5. (Opcional) Correr Seeders (para cargar datos de prueba):
   ```bash
   npx sequelize-cli db:seed:all
   ```
6. Levantar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   *El servidor debería correr en `http://localhost:3000`*.

---

## 3. Setup del Frontend
1. Entrar a la carpeta del frontend:
   ```bash
   cd proyfrontendgrupo02
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Levantar el servidor de desarrollo de Angular:
   ```bash
   npm start
   ```
   *La app debería estar disponible en `http://localhost:4200`*.

---

## 4. Datos de Conexión a la Base de Datos (Neon.tech)
La BD está alojada en la nube para que todos trabajemos sobre la misma base sin necesidad de instalar PostgreSQL.

| Campo | Valor |
|---|---|
| **Host** | *(Ver archivo .env en Google Drive)* |
| **Database** | `neondb` |
| **Role (Usuario)** | *(Ver archivo .env en Google Drive)* |
| **Password** | *(Ver archivo .env en Google Drive)* |
| **Connection String** | *(Ver archivo .env en Google Drive)* |

> Estos datos se copian del archivo `.env` del Drive y se pegan dentro de tu archivo `.env` local en la variable `DATABASE_URL`.

---

## 5. Solución de Problemas Comunes
*   **"Error: relation does not exist"** → Ejecuta `npx sequelize-cli db:migrate` en el repo del backend.
*   **"Cannot find module X"** → Ejecuta `npm install` en la carpeta correspondiente.
*   **Errores tras hacer `git pull`** → Ejecuta `npm install` en ambos repos para instalar dependencias nuevas.
