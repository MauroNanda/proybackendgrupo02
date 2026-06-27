# Trabajo Final Integrador - Programación y Servicios Web
## Facultad de Ingeniería - Universidad Nacional de Jujuy

---

### Objetivo General
Diseñar e implementar un sistema web completo, aplicando todos los conocimientos y tecnologías abordadas en la materia Programación y Servicios Web, tanto en frontend como en backend, incluyendo aspectos fundamentales como seguridad, consumo de servicios web externos, validaciones, gestión de datos, y desarrollo de una arquitectura organizada.

---

### Requisitos Generales del Proyecto

#### 1. Diseño del Sistema
* Los estudiantes deberán definir e implementar un sistema realista y funcional (educativo, social, comercial, deportivo, institucional, etc.) que contemple múltiples roles de usuario, operaciones CRUD, web services externos y que cumpla con las buenas prácticas de desarrollo web.
* El sistema deberá respetar el patrón de arquitectura MVC en backend, y componentes organizados en frontend Angular.

#### 2. Aplicación de Protocolo HTTP
* Uso de los métodos HTTP: GET, POST, PUT, DELETE.
* Entendimiento de la arquitectura cliente-servidor y del funcionamiento del protocolo HTTP/HTTPS.
* Implementación en servicios RESTful desde Node.js (Express) y consumo desde Angular.
* Visualización del tráfico HTTP con herramientas como Postman o API Tester.

#### 3. Desarrollo Frontend
* Maquetación con HTML5, CSS3, y uso extensivo de Bootstrap 5.
* Diseño responsivo y adaptativo (mobile-first).
* Uso de Angular para:
    * Componentes
    * Routing
    * Servicios HTTP
    * Formularios reactivos con validaciones personalizadas
    * Pipes, data binding y modularización
* Gestión de paquetes con NPM.
* *[Opcional]* Uso de sitios web progresivos (PWA) como valor agregado.

#### 4. Consumo e Implementación de Servicios Web
* Desarrollo de servicios REST en Node.js con Express.
* Integración de servicios web de terceros (al menos cuatro), por ejemplo:
    * Google (Calendario, Maps, Gmail)
    * Facebook / Instagram / Twitter (login social o publicaciones)
    * MercadoLibre / MercadoPago (productos, pagos y QR)
    * YouTube (videos embebidos)
* APIs públicas o privadas que sean relevantes al sistema.
* Llamadas asíncronas con Promesas y/o Observables.
* Pruebas con herramientas como Postman u otro.
* Documentación de endpoints.

#### 5. Seguridad en Aplicaciones Web
* Autenticación con JWT (JSON Web Tokens).
* Control de acceso por roles de usuario.
* Hasheo de contraseñas (bcrypt o similar).
* Seguridad en formularios y API (prevención de XSS, CSRF, inyecciones).
* Login social con APIs de Google, Facebook, etc. (OAuth).
* Auditoría de acciones.
* Historial de accesos.

#### 6. Base de Datos y Backend
* Implementación de una base de datos relacional (MySQL, Postgres).
* ORM: Sequelize.
* CRUD completos con modelos y controladores en Express.
* Validaciones en el servidor.
* Modularización del backend y documentación de API.

#### 7. Visualización y Estadísticas
* Panel administrativo con métricas (Dashboard):
    * Gráficos de barra, torta, línea (con librerías como Chart.js, ng2-charts, etc.).
    * Listado tabular con DataTables: filtros, búsqueda y paginación.
    * Exportación PDF.
    * Exportación Excel.

---

### Criterios de Entrega

* Dos repositorios Git independientes:
    * `proyfrontendgrupoXX` -> Frontend Angular
    * `proybackendgrupoXX` -> Backend Node.js
* Publicación del backend, frontend y BD en la web (opcional):
    * Ej. Render para proyecto frontend y backend.
* Documentación técnica del proyecto:
    * Introducción, objetivos, tecnología aplicada
    * Diagramas de arquitectura
    * Estructura de carpetas (frontend y backend)
    * Capturas de pantalla
    * Descripción de funcionalidades por rol
    * APIs utilizadas y cómo se integraron
    * Mecanismos de seguridad implementados

---

### Criterios de Evaluación

| Criterio | Puntos |
| :--- | :--- |
| Aplicación correcta de tecnologías frontend (Angular, Bootstrap) | 20 pts |
| Implementación backend (Express, base de datos, JWT) | 20 pts |
| Seguridad (2FA, JWT, roles, validaciones) | 15 pts |
| Consumo de servicios web externos | 15 pts |
| UI/UX - diseño adaptativo, navegación fluida, usabilidad | 10 pts |
| Documentación técnica y repositorios en orden | 10 pts |
| Presentación grupal y defensa | 10 pts |
| **Total** | **100 pts** |

---

### Criterios Generales
* La confección de Grupo es de exactamente 5 integrantes.
* Cada grupo redactará un documento de funcionalidades y un modelo de datos para revisión y aceptación de la propuesta por parte de un docente.
* El proyecto consta de al menos un control de avance (modalidad virtual/presencial).
* La defensa es grupal, la nota es individual.