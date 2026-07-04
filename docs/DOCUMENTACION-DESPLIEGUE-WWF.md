# EEM-OMECS — Documentación de despliegue para WWF Ecuador

**Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador**

| Campo | Valor |
|-------|-------|
| Versión de la aplicación | 0.1.0 |
| Fecha del documento | Julio 2026 |
| Destinatario | WWF Ecuador — Equipo de infraestructura y operaciones |
| Repositorio | `eem-omecs` |

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Descripción de la aplicación](#2-descripción-de-la-aplicación)
3. [Arquitectura y stack tecnológico](#3-arquitectura-y-stack-tecnológico)
4. [Requisitos de infraestructura](#4-requisitos-de-infraestructura)
5. [Componentes del sistema](#5-componentes-del-sistema)
6. [Despliegue con Docker (recomendado)](#6-despliegue-con-docker-recomendado)
7. [Despliegue sin Docker](#7-despliegue-sin-docker)
8. [Configuración de KoboToolBox](#8-configuración-de-kobotoolbox)
9. [Recolección de datos en campo (KoboToolBox)](#9-recolección-de-datos-en-campo-kobotoolbox)
10. [Archivo de reglas de puntuación (CSV)](#10-archivo-de-reglas-de-puntuación-csv)
11. [Variables de entorno](#11-variables-de-entorno)
12. [Proxy inverso y HTTPS](#12-proxy-inverso-y-https)
13. [Referencia de API REST](#13-referencia-de-api-rest)
14. [Rutas y funcionalidades de la interfaz](#14-rutas-y-funcionalidades-de-la-interfaz)
15. [Monitoreo y health checks](#15-monitoreo-y-health-checks)
16. [Verificación post-despliegue](#16-verificación-post-despliegue)
17. [Seguridad](#17-seguridad)
18. [Mantenimiento y actualizaciones](#18-mantenimiento-y-actualizaciones)
19. [Solución de problemas](#19-solución-de-problemas)
20. [Anexos](#20-anexos)

---

## 1. Resumen ejecutivo

EEM-OMECS es una aplicación web que permite evaluar la efectividad del manejo de áreas de conservación en Ecuador, con enfoque en Otras Medidas Efectivas de Conservación basadas en áreas (OMEC), según los criterios del Convenio sobre la Diversidad Biológica (CDB).

La aplicación:

- Obtiene levantamientos de campo desde **KoboToolBox**.
- Aplica reglas de puntuación definidas en un archivo **CSV** (`calculo_eem_omec.csv`).
- Presenta un **dashboard** con estadísticas, puntajes y detalle por levantamiento.

**Método de despliegue recomendado:** contenedor Docker en modo producción, detrás de un proxy inverso (Nginx, Traefik, etc.) con terminación TLS.

**Dependencias externas obligatorias:**

| Dependencia | Propósito |
|-------------|-----------|
| KoboToolBox (API v2) | Fuente de datos de formularios y envíos |
| Archivo `calculo_eem_omec.csv` | Reglas de evaluación y puntuación |

---

## 2. Descripción de la aplicación

### 2.1 Propósito

Medir y fortalecer la efectividad del manejo de áreas de conservación gestionadas por pueblos indígenas, comunidades locales, OSC, sector privado y gobiernos locales que aspiran al reconocimiento como OMEC.

### 2.2 Funcionalidades principales

| Funcionalidad | Descripción |
|---------------|-------------|
| Dashboard principal | Listado de levantamientos, puntajes agregados, filtros por área |
| Sistema de puntuación | Evaluación automática según criterios CBD (EEM, género, potencial OMEC) |
| Integración KoboToolBox | Proxy server-side para evitar problemas de CORS |
| Visor de CSV | Matriz interactiva de criterios de evaluación |
| Detalle de levantamiento | Vista individual con puntaje desglosado por sección |
| Exportación | Descarga de resultados de puntuación en JSON |
| Health check | Endpoint `/api/health` para monitoreo |

### 2.3 Usuarios objetivo

Personal técnico y de programas de conservación de WWF Ecuador que administra y consulta evaluaciones de áreas de conservación.

---

## 3. Arquitectura y stack tecnológico

### 3.1 Diagrama de arquitectura

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│   Navegador     │ ──────────────▶│  Proxy inverso   │
│   (usuarios)    │                │  (Nginx/Traefik) │
└─────────────────┘                └────────┬─────────┘
                                            │ HTTP :3000
                                            ▼
                                 ┌──────────────────────┐
                                 │  Contenedor Docker   │
                                 │  EEM-OMECS (Next.js) │
                                 │                      │
                                 │  ┌────────────────┐  │
                                 │  │ API Routes     │  │
                                 │  │ /api/kobo...   │──┼──▶ KoboToolBox API v2
                                 │  │ /api/scoring   │  │    (kf.kobotoolbox.org)
                                 │  │ /api/csv-data  │  │
                                 │  └────────────────┘  │
                                 │         │            │
                                 │         ▼            │
                                 │  calculo_eem_omec.csv│
                                 │  (volumen montado)   │
                                 └──────────────────────┘
```

### 3.2 Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Framework | Next.js (App Router) | 15.4.3 |
| UI | React | 19.1.0 |
| Estilos | Tailwind CSS | 4.x |
| Lenguaje | TypeScript | 5.x |
| Runtime | Node.js | 18+ (Alpine en Docker) |
| Parser CSV | csv-parse | 6.x |
| Contenedorización | Docker + Docker Compose | 3.8 |

### 3.3 Modo de build

La aplicación se compila con **output standalone** de Next.js (`next.config.js`), lo que genera un servidor Node.js autocontenido (`server.js`) optimizado para contenedores.

---

## 4. Requisitos de infraestructura

### 4.1 Servidor / clúster

| Recurso | Mínimo recomendado | Producción recomendada |
|---------|-------------------|------------------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 512 MB | 1–2 GB |
| Disco | 2 GB | 5 GB |
| SO | Linux (Ubuntu 22.04+, Debian 12+, RHEL 9+) | Linux LTS |

### 4.2 Software requerido

**Opción A — Docker (recomendada):**

- Docker Engine 20.10+
- Docker Compose v2+

**Opción B — Despliegue nativo:**

- Node.js 18.x o superior
- npm 9+ (incluido con Node.js)

### 4.3 Red

| Requisito | Detalle |
|-----------|---------|
| Puerto de aplicación | 3000 (interno al contenedor) |
| Puerto expuesto (host) | Configurable; por defecto **3005** en `docker-compose.yml` |
| Salida a Internet | HTTPS hacia `kf.kobotoolbox.org` (API KoboToolBox) |
| Entrada | HTTP/HTTPS desde usuarios internos o públicos según política WWF |

### 4.4 Accesos y credenciales que WWF debe proveer

1. **Token de API de KoboToolBox** con permisos de lectura sobre el formulario de levantamientos.
2. **ID del formulario (asset UID)** en KoboToolBox.
3. **Certificado TLS** (si se expone vía HTTPS con proxy inverso propio).
4. **Archivo `calculo_eem_omec.csv`** actualizado (incluido en el repositorio; WWF puede sustituirlo al actualizar criterios).

---

## 5. Componentes del sistema

### 5.1 Estructura del repositorio

```
eem-omecs/
├── calculo_eem_omec.csv      # Reglas de puntuación (CRÍTICO)
├── docker-compose.yml        # Orquestación producción
├── docker-compose.dev.yml    # Orquestación desarrollo
├── Dockerfile                # Imagen producción (multi-stage)
├── Dockerfile.dev            # Imagen desarrollo
├── next.config.js            # Configuración Next.js (standalone)
├── package.json
├── public/                   # Assets estáticos
├── src/
│   └── app/
│       ├── api/              # Endpoints REST
│       │   ├── csv-data/
│       │   ├── health/
│       │   ├── koboToolBox/
│       │   └── scoring/
│       ├── components/       # Componentes UI
│       ├── hooks/            # Hooks React
│       ├── services/         # Lógica de negocio
│       ├── levantamiento/    # Vistas de detalle
│       └── page.tsx          # Dashboard principal
└── test-api.sh               # Script de prueba de API
```

### 5.2 Archivos críticos para el despliegue

| Archivo | Rol |
|---------|-----|
| `Dockerfile` | Build de imagen de producción |
| `docker-compose.yml` | Define servicio, puertos, volúmenes y health check |
| `calculo_eem_omec.csv` | Reglas de evaluación; **debe estar montado o presente en `/app`** |
| `.env` | Credenciales KoboToolBox (no commitear; ver `.env.example`) |
| `src/app/config/koboToolBoxEnv.ts` | Lectura centralizada de variables de entorno Kobo |

> **Importante:** La imagen Docker de producción **no incluye** el CSV en el build final. El archivo debe montarse como volumen (como en `docker-compose.yml`) o copiarse manualmente al directorio `/app` del contenedor.

---

## 6. Despliegue con Docker (recomendado)

### 6.1 Obtener el código fuente

```bash
git clone <url-del-repositorio> eem-omecs
cd eem-omecs
```

Sustituya `<url-del-repositorio>` por la URL que WWF reciba del equipo de desarrollo.

### 6.2 Despliegue en producción

```bash
# 1. Construir e iniciar el contenedor en segundo plano
docker compose up --build -d

# 2. Verificar estado
docker compose ps

# 3. Revisar logs
docker compose logs -f eem-omecs

# 4. Probar health check
curl http://localhost:3005/api/health
```

**Acceso por defecto:** `http://<servidor>:3005`

> **Nota sobre puertos:** En `docker-compose.yml` el puerto del host es **3005** mapeado al **3000** interno del contenedor (`3005:3000`). Ajuste según la política de puertos de WWF.

### 6.3 Contenido de `docker-compose.yml` (referencia)

El servicio de producción define:

| Parámetro | Valor |
|-----------|-------|
| Nombre del servicio | `eem-omecs` |
| Nombre del contenedor | `eem-omecs-app` |
| Imagen | Build local desde `Dockerfile` |
| Puerto | `3005:3000` |
| Reinicio | `unless-stopped` |
| Volumen | `./calculo_eem_omec.csv:/app/calculo_eem_omec.csv:ro` |
| Health check | `GET http://localhost:3000/api/health` cada 30 s |

### 6.4 Comandos operativos

| Acción | Comando |
|--------|---------|
| Iniciar | `docker compose up -d` |
| Detener | `docker compose down` |
| Reiniciar | `docker compose restart` |
| Reconstruir tras cambios | `docker compose up --build -d` |
| Ver logs | `docker compose logs -f eem-omecs` |
| Limpiar contenedores y redes | `docker compose down --volumes --remove-orphans` |

### 6.5 Despliegue en entorno de desarrollo (opcional)

Para pruebas con recarga en caliente del código fuente:

```bash
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml logs -f eem-omecs-dev
```

En desarrollo el puerto expuesto es **3000:3000** y el código fuente se monta como volumen.

### 6.6 Despliegue en Kubernetes (orientación)

Si WWF despliega en Kubernetes, los elementos mínimos son:

1. **Deployment** con imagen construida desde `Dockerfile`.
2. **Service** exponiendo el puerto 3000.
3. **ConfigMap o Secret** para credenciales de KoboToolBox (requiere adaptación del código; ver sección 8).
4. **Volume / ConfigMap** montando `calculo_eem_omec.csv` en `/app/calculo_eem_omec.csv`.
5. **Ingress** con TLS hacia el Service.
6. **Liveness/Readiness probe** apuntando a `/api/health`.

Ejemplo de probe:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 40
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
```

---

## 7. Despliegue sin Docker

### 7.1 Instalación

```bash
git clone <url-del-repositorio> eem-omecs
cd eem-omecs
npm ci
```

### 7.2 Build y ejecución en producción

```bash
# Compilar
npm run build

# Iniciar servidor (puerto 3000 por defecto)
NODE_ENV=production npm run start
```

### 7.3 Ejecución con process manager (recomendado)

Para entornos bare-metal o VM, use un gestor de procesos como **PM2** o **systemd**:

**Ejemplo con PM2:**

```bash
npm run build
pm2 start npm --name "eem-omecs" -- start
pm2 save
pm2 startup
```

**Ejemplo de unidad systemd** (`/etc/systemd/system/eem-omecs.service`):

```ini
[Unit]
Description=EEM-OMECS Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/eem-omecs
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=NEXT_PUBLIC_BASE_URL=https://eem-omecs.wwf.ec
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable eem-omecs
sudo systemctl start eem-omecs
sudo systemctl status eem-omecs
```

Asegúrese de que `calculo_eem_omec.csv` esté en el directorio raíz del proyecto (`/opt/eem-omecs/`).

---

## 8. Configuración de KoboToolBox

### 8.1 Descripción de la integración

La aplicación actúa como **proxy server-side** hacia la API v2 de KoboToolBox (`https://kf.kobotoolbox.org/api/v2`). Esto evita restricciones CORS del navegador y centraliza la autenticación en el servidor.

### 8.2 Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `KOBOTOOLBOX_FORM_ID` | Sí* | Identificador del formulario (asset UID) en KoboToolBox |
| `FORM_ID` | Sí* | Alias alternativo de `KOBOTOOLBOX_FORM_ID` |
| `KOBOTOOLBOX_TOKEN` | Sí* | Token de API (`Authorization: Token …`) |
| `KOBOTOOLBOX_BASE_URL` | No | URL base de la API (default: `https://kf.kobotoolbox.org/api/v2`) |

\* Obligatorias para consultas reales a KoboToolBox. Si no están definidas, la API responde HTTP 503 salvo que se use `mock=true`.

La configuración se centraliza en `src/app/config/koboToolBoxEnv.ts` y solo se lee en el servidor (el token nunca se expone al navegador).

### 8.3 Cómo configurar credenciales de WWF

**Opción A — archivo `.env` (recomendado para Docker):**

```bash
cp .env.example .env
# Editar .env con los valores de WWF:
# KOBOTOOLBOX_FORM_ID=su-form-id
# KOBOTOOLBOX_TOKEN=su-token
docker compose up --build -d
```

**Opción B — variables en el shell:**

```bash
export KOBOTOOLBOX_FORM_ID=su-form-id
export KOBOTOOLBOX_TOKEN=su-token
docker compose up --build -d
```

**Opción C — despliegue nativo (systemd / PM2):**

Defina las mismas variables en la unidad de servicio o en el entorno del proceso antes de `npm run start`.

No es necesario editar código fuente ni reconstruir la imagen para rotar credenciales; basta reiniciar el contenedor tras actualizar `.env`.

### 8.4 Obtener un token de KoboToolBox

1. Inicie sesión en [KoboToolBox](https://www.kobotoolbox.org/).
2. Vaya a **Account Settings → Security → API Token**.
3. Genere o copie el token de API.
4. Verifique que el usuario asociado al token tenga permiso de **lectura** sobre el formulario de levantamientos.

### 8.5 Modo mock (datos simulados)

Para pruebas sin conexión a KoboToolBox, la API acepta el parámetro `mock=true`:

```
GET /api/koboToolBox?action=submissions&mock=true
```

Páginas de prueba disponibles en la interfaz:

| Ruta | Uso |
|------|-----|
| `/config` | Prueba básica de API con toggle mock/real |
| `/advanced-config` | Prueba de token y Form ID personalizados |
| `/test-api` | Prueba interactiva de endpoints |
| `/test-token` | Diagnóstico de autenticación Kobo |

### 8.6 Endpoints de KoboToolBox utilizados

| Acción interna | Endpoint KoboToolBox |
|----------------|---------------------|
| `form` | `GET /api/v2/assets/{FORM_ID}/` |
| `submissions` | `GET /api/v2/assets/{FORM_ID}/data/` |
| `submission` | `GET /api/v2/assets/{FORM_ID}/data/{submissionId}/` |
| `form_structure` | `GET /api/v2/assets/{FORM_ID}/content/` |
| `form_xform` | `GET /api/v2/assets/{FORM_ID}/xform/` |
| `form_export` | `GET /api/v2/assets/{FORM_ID}/export/` |

---

## 9. Recolección de datos en campo (KoboToolBox)

EEM-OMECS **no captura datos directamente**. La recolección en campo se realiza con **KoboToolBox** (aplicación móvil o formulario web). Una vez enviados los levantamientos al servidor de Kobo, EEM-OMECS los consulta vía API, aplica las reglas de puntuación y los muestra en el dashboard.

### 9.1 Visión general del flujo

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Preparación     │     │  Recolección     │     │  Análisis        │
│  del formulario  │────▶│  en campo        │────▶│  EEM-OMECS       │
│  (XLSForm/Kobo)  │     │  (móvil o web)   │     │  (dashboard)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
  Subir y desplegar         Enviar envíos            API + scoring CSV
  en KoboToolBox            a kf.kobotoolbox.org     automático
```

### 9.2 Requisitos previos

| Requisito | Descripción |
|-----------|-------------|
| Cuenta KoboToolBox | Cuenta de organización o proyecto WWF en [kobotoolbox.org](https://www.kobotoolbox.org/) |
| Archivo XLSForm | Formulario de evaluación EEM-OMECS en formato Excel (`.xlsx`) compatible con Kobo |
| Servidor Kobo | Por defecto: `https://kf.kobotoolbox.org` (instancia global de Kobo Form) |
| Conectividad | Internet para envío de datos; la app móvil permite trabajo **offline** y envío posterior |
| Coherencia de campos | Los nombres de campo del formulario deben coincidir con los definidos en `calculo_eem_omec.csv` (columna `column`) para que el scoring funcione correctamente |

> **Nota:** El archivo `calculo_eem_omec.csv` define las **reglas de puntuación**, no el formulario en sí. WWF debe contar con el **XLSForm** del instrumento de evaluación (provisto por el equipo del proyecto o reconstruido a partir de la matriz de criterios).

### 9.3 Publicar el formulario en KoboToolBox

#### Paso 1 — Acceder a KoboToolBox

1. Ingrese a [https://kf.kobotoolbox.org](https://kf.kobotoolbox.org) con las credenciales de la cuenta WWF.
2. En el panel principal, haga clic en **New** → **Upload an XLSForm** (o **Build online** si se crea desde cero).

#### Paso 2 — Cargar el formulario

1. Seleccione el archivo `.xlsx` del formulario EEM-OMECS.
2. KoboToolBox validará la estructura. Corrija errores de sintaxis XLSForm si los reporta.
3. Una vez cargado, abra el formulario desde la lista de proyectos.

#### Paso 3 — Desplegar el formulario

1. En la vista del formulario, haga clic en **Deploy** (si aún no está desplegado).
2. Confirme el despliegue. El formulario quedará activo para recolección.

#### Paso 4 — Obtener el Form ID

El **Form ID** (asset UID) es necesario para configurar EEM-OMECS:

1. Abra el formulario desplegado en KoboToolBox.
2. El ID aparece en la URL del navegador:
   ```
   https://kf.kobotoolbox.org/#/forms/{FORM_ID}/summary
   ```
3. Copie el valor `{FORM_ID}` y configúrelo en `.env` como `KOBOTOOLBOX_FORM_ID`.

#### Paso 5 — Configurar permisos de usuarios encuestadores

1. En KoboToolBox, vaya a **Settings** del formulario o del proyecto.
2. Asigne permisos a los usuarios o equipos que realizarán levantamientos en campo.
3. Cada encuestador necesitará **usuario y contraseña de Kobo** (distintos del token de API usado por EEM-OMECS).

#### Paso 6 — Conectar EEM-OMECS

1. Genere un **token de API** (sección 8.4).
2. Configure `.env` con `KOBOTOOLBOX_FORM_ID` y `KOBOTOOLBOX_TOKEN`.
3. Reinicie la aplicación y verifique en `/config` que la API responde correctamente.

### 9.4 Recolección con aplicación móvil (KoboCollect)

KoboCollect es la aplicación oficial para levantamientos **offline** en dispositivos Android e iOS.

#### Instalación

| Plataforma | Enlace |
|------------|--------|
| Android | [Google Play — KoboCollect](https://play.google.com/store/apps/details?id=org.koboc.collect.android) |
| iOS | [App Store — KoboCollect](https://apps.apple.com/app/kobocollect/id/id1139624722) |

#### Configuración inicial del dispositivo

1. Abra **KoboCollect** en el teléfono o tablet.
2. Toque el menú (☰) → **General Settings** (Configuración general).
3. En **Server**, configure la URL del servidor:
   ```
   https://kf.kobotoolbox.org
   ```
   Si WWF usa una instancia propia de Kobo, use la URL correspondiente y actualice también `KOBOTOOLBOX_BASE_URL` en EEM-OMECS.
4. Regrese al menú principal → **Configure** (o **Admin Settings**).
5. Toque **Add user** e ingrese el **usuario y contraseña** de Kobo del encuestador (no el token de API).

#### Descargar el formulario en el dispositivo

1. En el menú principal, seleccione **Get Blank Form** (Obtener formulario en blanco).
2. Toque **Refresh** para listar los formularios disponibles para ese usuario.
3. Marque el formulario **EEM-OMECS** (o el nombre asignado al instrumento).
4. Toque **Get Selected** para descargarlo al dispositivo.

#### Realizar un levantamiento en campo

1. En el menú principal, seleccione **Fill Blank Form** (Llenar formulario).
2. Elija el formulario EEM-OMECS.
3. Complete todas las secciones del cuestionario:
   - **Sección 1:** Información de quien completa el formulario
   - **Sección 2:** Evaluación participativa
   - **Sección 3:** Información del área de conservación
   - **Secciones siguientes:** Criterios de evaluación EEM / OMEC
4. Guarde el formulario como **Finalized** (finalizado) al terminar.

> **Trabajo offline:** KoboCollect no requiere conexión durante el llenado. Los datos se almacenan localmente hasta que se envíen al servidor.

#### Enviar los datos al servidor

1. Cuando haya conectividad (WiFi o datos móviles), vaya a **Send Finalized Form** (Enviar formulario finalizado).
2. Seleccione los levantamientos completados.
3. Toque **Send Selected** (Enviar seleccionados).
4. Espere la confirmación de envío exitoso.

#### Buenas prácticas en campo

- Verificar que el formulario descargado sea la **última versión** antes de salir a campo (re-descargar si hubo actualizaciones).
- Enviar los formularios **diariamente** cuando haya señal, para no acumular envíos pendientes.
- No eliminar formularios finalizados del dispositivo hasta confirmar que aparecen en KoboToolBox web.
- Usar **Save as draft** solo para borradores incompletos; el scoring en EEM-OMECS procesa envíos **finalizados**.

### 9.5 Recolección con formulario web (Enketo)

Para levantamientos con conexión a Internet estable (oficina, comunidad con conectividad, talleres), use el formulario web generado automáticamente por KoboToolBox (motor **Enketo**).

#### Obtener el enlace web

1. Inicie sesión en [https://kf.kobotoolbox.org](https://kf.kobotoolbox.org).
2. Abra el formulario EEM-OMECS desplegado.
3. Haga clic en **Collect Data** (Recolectar datos) o el botón equivalente de recolección.
4. Seleccione **Online data entry only** (Solo entrada de datos en línea).
5. Copie la **URL del formulario web** (Enketo). Tendrá un formato similar a:
   ```
   https://ee.kobotoolbox.org/x/#YYZZxxxx
   ```

#### Compartir el formulario con encuestadores

| Método | Uso recomendado |
|--------|-----------------|
| Enlace directo | Enviar por correo, WhatsApp o intranet WWF |
| Código QR | Imprimir o proyectar en talleres; KoboToolBox permite generar QR desde la misma pantalla |
| Acceso desde PC/tablet | Abrir la URL en cualquier navegador moderno (Chrome, Firefox, Safari, Edge) |

#### Completar el levantamiento web

1. El encuestador abre el enlace en el navegador.
2. Completa el formulario sección por sección (misma estructura que en móvil).
3. Al finalizar, hace clic en **Submit** (Enviar).
4. El envío se almacena inmediatamente en el servidor KoboToolBox (requiere conexión activa).

#### Limitaciones del formulario web

- **No funciona offline.** Si la conectividad es intermitente, preferir KoboCollect.
- No admite algunas funciones avanzadas de captura (p. ej. ciertos tipos de GPS offline) según la configuración del XLSForm.
- Cada envío web queda registrado con marca de tiempo al momento del submit.

### 9.6 Revisión y validación de envíos en KoboToolBox

Antes o después del análisis en EEM-OMECS, el equipo WWF puede revisar envíos en KoboToolBox:

1. Abra el formulario → **Data** (Datos) → **Table** o **Reports**.
2. Revise cada envío y, si está habilitado, asigne estado de validación (**Approved**, **Not Approved**, **On Hold**, etc.).
3. EEM-OMECS lee el campo `_validation_status` y lo muestra traducido en el dashboard (p. ej. "Aprobado", "En Espera").

Para exportar datos manualmente desde Kobo:

1. **Data** → **Downloads** → elija formato (CSV, XLSX, GeoJSON).
2. Útil para respaldos o análisis externos; EEM-OMECS obtiene los datos automáticamente vía API.

### 9.7 Flujo de datos: del levantamiento al dashboard EEM-OMECS

Una vez enviados los levantamientos a KoboToolBox:

```
Encuestador                    KoboToolBox                    EEM-OMECS
    │                               │                              │
    │  Envía formulario             │                              │
    │  (KoboCollect / Enketo)       │                              │
    │──────────────────────────────▶│                              │
    │                               │                              │
    │                               │  API GET /data/              │
    │                               │◀─────────────────────────────│
    │                               │                              │
    │                               │  JSON del envío              │
    │                               │─────────────────────────────▶│
    │                               │                              │
    │                               │                    scoringService
    │                               │                    + calculo_eem_omec.csv
    │                               │                              │
    │                               │                    Dashboard (/)
    │                               │                    /levantamiento/[id]
```

**Pasos para ver los datos en EEM-OMECS:**

1. Confirme que el envío aparece en KoboToolBox (**Data** → lista de submissions).
2. Abra el dashboard de EEM-OMECS (`/`).
3. La aplicación consulta `/api/koboToolBox?action=submissions` y muestra los levantamientos.
4. Haga clic en un levantamiento para ver el detalle en `/levantamiento/[id]`.
5. El puntaje se calcula automáticamente al cargar, usando las reglas del CSV.
6. Use **Ver detalles del formulario** para el desglose completo por criterio.

**Forzar actualización del listado:** use el botón de refrescar en el dashboard o recargue la página.

**Verificar un envío específico vía API:**

```bash
# Listar envíos
curl "https://<dominio-eem-omecs>/api/koboToolBox?action=submissions&page=1&pageSize=10"

# Obtener un envío por ID
curl "https://<dominio-eem-omecs>/api/koboToolBox?action=submission&submissionId=<UUID>"

# Calcular puntuación
curl -X POST "https://<dominio-eem-omecs>/api/scoring" \
  -H "Content-Type: application/json" \
  -d '{"submissionId": "<UUID>"}'
```

### 9.8 Resolución de problemas en recolección

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Formulario no aparece en KoboCollect | Usuario sin permiso o formulario no desplegado | Verificar permisos en Kobo y que el formulario esté **Deployed** |
| Error al enviar desde móvil | Sin conexión o credenciales incorrectas | Comprobar WiFi/datos; reconfigurar usuario en KoboCollect |
| Envío no visible en EEM-OMECS | Token/Form ID incorrectos o caché | Verificar `.env`; refrescar dashboard; revisar logs |
| Puntaje en cero o incompleto | Nombres de campo no coinciden con CSV | Alinear XLSForm con columna `column` de `calculo_eem_omec.csv` |
| Formulario web no carga | URL incorrecta o formulario archivado | Regenerar enlace Enketo desde KoboToolBox |

---

## 10. Archivo de reglas de puntuación (CSV)

### 10.1 Descripción

El archivo `calculo_eem_omec.csv` en la raíz del proyecto contiene:

- Definición de preguntas del formulario.
- Reglas de puntuación por pregunta.
- Categorías: EEM, género, potencial OMEC.
- Tipos de regla: `select`, `multiple_max`, `value`.

### 10.2 Estructura de columnas

| Columna | Descripción |
|---------|-------------|
| `column` | Identificador de la pregunta/campo del formulario |
| `name` | Texto descriptivo de la pregunta |
| `section` | Sección de evaluación |
| `eem` | Categoría EEM |
| `genero` | Categoría de género |
| `potencial_omec` | Categoría potencial OMEC |
| `value` | Valor esperado para otorgar puntaje |
| `score` | Puntaje asignado |
| `type` | Tipo de regla (`select`, `multiple_max`, `value`) |

### 10.3 Actualización del CSV

1. Sustituya el archivo `calculo_eem_omec.csv` en el servidor host.
2. Si usa Docker con volumen montado (configuración por defecto), **no es necesario reconstruir** la imagen; el cambio es inmediato tras reiniciar o en caliente según el sistema de archivos.
3. Verifique cargando `/api/csv-data` o la página `/csv-viewer`.

### 10.4 Respaldo

Mantenga copias de seguridad versionadas del CSV antes de cada actualización de criterios de evaluación.

---

## 11. Variables de entorno

### 11.1 Variables soportadas actualmente

| Variable | Obligatoria | Valor por defecto | Descripción |
|----------|-------------|-------------------|-------------|
| `NODE_ENV` | Sí (prod) | — | Debe ser `production` en producción |
| `NEXT_TELEMETRY_DISABLED` | No | `1` | Desactiva telemetría de Next.js |
| `KOBOTOOLBOX_FORM_ID` | Sí* | — | ID del formulario KoboToolBox |
| `FORM_ID` | Sí* | — | Alias de `KOBOTOOLBOX_FORM_ID` |
| `KOBOTOOLBOX_TOKEN` | Sí* | — | Token de API KoboToolBox |
| `KOBOTOOLBOX_BASE_URL` | No | `https://kf.kobotoolbox.org/api/v2` | URL base de la API Kobo |
| `PORT` | No | `3000` | Puerto interno del servidor Node.js |
| `HOSTNAME` | No | `0.0.0.0` | Interfaz de escucha (definido en Dockerfile) |
| `NEXT_PUBLIC_BASE_URL` | Condicional | `http://localhost:3000` | URL pública base; **requerida** si la API de scoring debe resolver envíos por ID en producción |

\* Obligatorias para operación con datos reales de KoboToolBox.

### 11.2 Configuración en Docker Compose

Ejemplo para añadir `NEXT_PUBLIC_BASE_URL` en `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_TELEMETRY_DISABLED=1
  - KOBOTOOLBOX_FORM_ID=${KOBOTOOLBOX_FORM_ID}
  - KOBOTOOLBOX_TOKEN=${KOBOTOOLBOX_TOKEN}
  - NEXT_PUBLIC_BASE_URL=https://eem-omecs.wwf.ec
env_file:
  - .env
```

> `NEXT_PUBLIC_*` se incorpora en tiempo de **build**. Si se usa en el cliente, reconstruya la imagen tras cambiarla. Para el endpoint de scoring server-side, puede inyectarse también en runtime.

---

## 12. Proxy inverso y HTTPS

Se recomienda **no exponer el contenedor directamente a Internet** sin un proxy inverso con TLS.

### 12.1 Ejemplo con Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name eem-omecs.wwf.ec;

    ssl_certificate     /etc/ssl/certs/eem-omecs.crt;
    ssl_certificate_key /etc/ssl/private/eem-omecs.key;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name eem-omecs.wwf.ec;
    return 301 https://$host$request_uri;
}
```

Ajuste `proxy_pass` al puerto host configurado en Docker Compose (3005 por defecto).

### 12.2 Consideraciones

- Configure `NEXT_PUBLIC_BASE_URL` con la URL HTTPS pública.
- El contenedor corre como usuario **no root** (`nextjs`, UID 1001) en la imagen de producción.
- Restrinja el acceso por VPN, IP allowlist o autenticación a nivel de proxy si la política de WWF lo requiere.

---

## 13. Referencia de API REST

Base URL: `https://<dominio>/api`

### 13.1 Health check

```
GET /api/health
```

**Respuesta 200:**

```json
{
  "status": "healthy",
  "timestamp": "2026-07-04T12:00:00.000Z",
  "service": "eem-omecs"
}
```

### 13.2 Datos CSV (reglas de puntuación)

```
GET /api/csv-data
```

Devuelve un array JSON con todas las filas válidas del CSV de reglas.

### 13.3 KoboToolBox (proxy)

```
GET /api/koboToolBox?action=<accion>&[parámetros]
```

| Parámetro | Valores | Descripción |
|-----------|---------|-------------|
| `action` | `form`, `submissions`, `submission`, `form_structure`, `form_xform`, `form_export` | Acción a ejecutar |
| `page` | número | Paginación (submissions) |
| `pageSize` | número | Tamaño de página (submissions) |
| `submissionId` | UUID | ID del envío (action=submission) |
| `mock` | `true` | Usar datos simulados |
| `testUrl` | URL | Probar URL de Kobo directamente (diagnóstico) |

**Ejemplo — listar envíos:**

```
GET /api/koboToolBox?action=submissions&page=1&pageSize=50
```

### 13.4 Scoring (puntuación)

**Obtener resumen de reglas:**

```
GET /api/scoring
```

**Evaluar un envío:**

```
POST /api/scoring
Content-Type: application/json
```

Cuerpo (opción A — envío completo):

```json
{
  "submission": { "...": "datos del formulario Kobo" }
}
```

Cuerpo (opción B — por ID):

```json
{
  "submissionId": "uuid-del-envio"
}
```

**Prueba de conectividad:**

```json
{
  "test": true
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "result": {
    "totalScore": 0,
    "maxPossibleScore": 0,
    "percentage": 0,
    "categoryScores": [],
    "detailedResults": []
  },
  "validation": {},
  "timestamp": "2026-07-04T12:00:00.000Z"
}
```

---

## 14. Rutas y funcionalidades de la interfaz

| Ruta | Descripción | Uso en producción |
|------|-------------|-------------------|
| `/` | Dashboard principal | Sí |
| `/levantamiento/[id]` | Detalle de un levantamiento | Sí |
| `/levantamiento/[id]/detalles` | Desglose extendido de puntuación | Sí |
| `/csv-viewer` | Visor de matriz de criterios CSV | Sí |
| `/config` | Prueba de API Kobo (mock/real) | Diagnóstico |
| `/advanced-config` | Prueba de token Kobo personalizado | Diagnóstico |
| `/test-api` | Consola de prueba de endpoints | Diagnóstico |
| `/test-scoring-ui` | Interfaz de prueba de scoring | Diagnóstico |
| `/test-scoring-refactor` | Pruebas de refactor scoring | Desarrollo |
| `/test-token` | Diagnóstico de token Kobo | Diagnóstico |
| `/test-urls` | Prueba de URLs Kobo | Diagnóstico |

> En producción se recomienda restringir o deshabilitar las rutas de diagnóstico (`/test-*`, `/config`, `/advanced-config`) mediante reglas del proxy inverso.

---

## 15. Monitoreo y health checks

### 15.1 Health check del contenedor

Docker Compose ejecuta automáticamente:

```
wget --spider http://localhost:3000/api/health
```

| Parámetro | Valor |
|-----------|-------|
| Intervalo | 30 s |
| Timeout | 10 s |
| Reintentos | 3 |
| Período inicial | 40 s |

### 15.2 Integración con monitoreo externo

Configure su sistema de monitoreo (Prometheus, Datadog, Uptime Kuma, etc.) para consultar periódicamente:

```
GET https://<dominio>/api/health
```

Criterio de alerta: respuesta distinta de HTTP 200 o campo `status` ≠ `"healthy"`.

### 15.3 Logs

```bash
# Docker
docker compose logs -f eem-omecs

# systemd
journalctl -u eem-omecs -f
```

Los errores de KoboToolBox y del CSV se registran en la salida estándar del proceso Node.js.

---

## 16. Verificación post-despliegue

### 16.1 Checklist

- [ ] Contenedor/servicio en estado `running` / `active`
- [ ] `GET /api/health` responde 200
- [ ] `GET /api/csv-data` devuelve datos (no error 500)
- [ ] `GET /api/koboToolBox?action=form` responde con datos del formulario (o mock si aplica)
- [ ] Dashboard `/` carga listado de levantamientos
- [ ] Detalle `/levantamiento/<id>` muestra puntuación
- [ ] HTTPS funciona correctamente vía proxy inverso
- [ ] Token de KoboToolBox válido y con permisos

### 16.2 Script de prueba incluido

El repositorio incluye `test-api.sh`:

```bash
chmod +x test-api.sh
./test-api.sh
```

Ajuste `BASE_URL` dentro del script si la aplicación no corre en `localhost:3000` (por ejemplo, `http://localhost:3005` con Docker Compose por defecto).

También puede usar la página web `/test-api` para pruebas interactivas.

---

## 17. Seguridad

### 17.1 Medidas implementadas

| Medida | Detalle |
|--------|---------|
| Usuario no root | Contenedor producción ejecuta como `nextjs` (UID 1001) |
| Proxy server-side | Token Kobo no se expone al navegador en peticiones normales |
| Volumen CSV read-only | Montado con flag `:ro` en Docker Compose |
| Health check | Detección automática de contenedor no saludable |

### 17.2 Recomendaciones para WWF

1. **Rotar el token de KoboToolBox** periódicamente y actualizar el código o variables de entorno.
2. **No commitear tokens** en repositorios públicos.
3. **Restringir rutas de diagnóstico** en producción.
4. **Aplicar HTTPS** obligatorio en el proxy inverso.
5. **Mantener Node.js y dependencias actualizadas** (`npm audit`, reconstrucción periódica de imagen).
6. **Firewall:** permitir solo puertos 80/443 hacia el proxy; bloquear acceso directo al puerto 3005 desde Internet.

---

## 18. Mantenimiento y actualizaciones

### 18.1 Actualizar la aplicación

```bash
cd eem-omecs
git pull origin main          # Obtener última versión
docker compose up --build -d  # Reconstruir e reiniciar
docker compose ps             # Verificar estado
curl http://localhost:3005/api/health
```

### 18.2 Actualizar reglas de puntuación

1. Reemplace `calculo_eem_omec.csv`.
2. Verifique con `/api/csv-data` o `/csv-viewer`.
3. No requiere rebuild si el archivo está montado como volumen.

### 18.3 Actualizar credenciales Kobo

1. Actualice `KOBOTOOLBOX_FORM_ID` y/o `KOBOTOOLBOX_TOKEN` en `.env`.
2. Reinicie: `docker compose restart` (no requiere rebuild).
3. Verifique en `/config` o `/advanced-config`.

### 18.4 Ventana de mantenimiento sugerida

- Duración estimada de rebuild: 3–8 minutos según recursos del servidor.
- Impacto: indisponibilidad breve del servicio durante el reinicio del contenedor.

---

## 19. Solución de problemas

### 19.1 El contenedor no inicia

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Error en build | Dependencias o red | Revisar `docker compose logs`; verificar conectividad npm |
| Puerto en uso | Conflicto 3005 | Cambiar mapeo en `docker-compose.yml` o liberar puerto |
| Health check failing | App tarda en arrancar | Aumentar `start_period` en healthcheck |

### 19.2 Error al leer CSV

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| HTTP 500 en `/api/csv-data` | Archivo ausente en `/app` | Verificar volumen montado y ruta del archivo |
| Datos vacíos | CSV corrupto o mal formateado | Validar encoding UTF-8 y columnas requeridas |

### 19.3 Errores de KoboToolBox

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Respuesta HTML en lugar de JSON | Token inválido o expirado | Generar nuevo token en KoboToolBox |
| HTTP 401 / 403 | Permisos insuficientes | Verificar acceso al formulario con el usuario del token |
| Sin envíos | Form ID incorrecto | Confirmar asset UID en KoboToolBox |
| Timeout | Firewall bloquea salida | Permitir HTTPS a `kf.kobotoolbox.org` |

### 19.4 Puntuación incorrecta o vacía

1. Verifique que los nombres de columna en el CSV coinciden con los campos del formulario Kobo.
2. Use `/test-scoring-ui` con un envío de prueba.
3. Revise logs del servidor para errores en `scoringService`.

### 19.5 Comandos de diagnóstico

```bash
# Estado del contenedor
docker compose ps

# Logs recientes
docker compose logs --tail=100 eem-omecs

# Entrar al contenedor
docker exec -it eem-omecs-app sh

# Verificar CSV dentro del contenedor
docker exec eem-omecs-app ls -la /app/calculo_eem_omec.csv

# Probar health desde el host
curl -v http://localhost:3005/api/health

# Probar conectividad a Kobo desde el servidor
curl -I https://kf.kobotoolbox.org/api/v2/
```

---

## 20. Anexos

### Anexo A — Scripts npm disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Desarrollo | `npm run dev` | Servidor dev con Turbopack (puerto 3000) |
| Build | `npm run build` | Compilación producción |
| Start | `npm run start` | Servidor producción |
| Lint | `npm run lint` | Análisis ESLint |

### Anexo B — Dependencias principales

| Paquete | Versión | Uso |
|---------|---------|-----|
| next | 15.4.3 | Framework web |
| react | 19.1.0 | UI |
| csv-parse | 6.1.0 | Lectura del CSV de reglas |
| tailwindcss | 4.x | Estilos |

### Anexo C — Contacto y soporte

Complete con los datos del equipo entregador:

| Rol | Contacto |
|-----|----------|
| Desarrollo técnico | _[nombre / email]_ |
| Producto / programa | _[nombre / email]_ |
| Repositorio | _[URL Git]_ |

### Anexo D — Glosario

| Término | Definición |
|---------|------------|
| **EEM** | Evaluación de Efectividad de Manejo |
| **OMEC** | Otras Medidas Efectivas de Conservación basadas en áreas |
| **CBD / CDB** | Convenio sobre la Diversidad Biológica |
| **KoboToolBox** | Plataforma de recolección de datos en campo |
| **Levantamiento** | Envío individual de un formulario de evaluación |

---

*Documento generado para entrega a WWF Ecuador. Versión preliminar en Markdown — pendiente de aprobación antes de exportar a formato Word (.docx).*
