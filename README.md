# EEM-OMECS - Ecuador

**Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador**

A comprehensive web application for evaluating the effectiveness of conservation area management managed by various actors, including indigenous peoples and nationalities, local communities, civil society organizations, private sector, and local governments, who aspire to be recognized as Other Effective Area-based Conservation Measures (OMEC) according to the criteria established by the Convention on Biological Diversity (CBD).

> **Documentación completa de despliegue (WWF):** [docs/DOCUMENTACION-DESPLIEGUE-WWF.md](docs/DOCUMENTACION-DESPLIEGUE-WWF.md)

## 🎯 Purpose

This tool measures and strengthens the effectiveness of conservation area management by providing:
- Automated scoring and evaluation of conservation area submissions
- Integration with KoboToolBox for data collection
- Comprehensive assessment based on CBD criteria
- Visual dashboard for monitoring and analysis
- Export capabilities for detailed results

## ✨ Features

### Core Functionality
- **Automated Scoring System**: Evaluates submissions based on predefined scoring rules
- **KoboToolBox Integration**: Fetches and processes form submissions from KoboToolBox
- **Real-time Dashboard**: Displays submission statistics, scores, and trends
- **CSV Data Viewer**: Interactive matrix for evaluation criteria
- **Test Scoring UI**: Development tools for testing scoring algorithms
- **Export Functionality**: Download scoring results in JSON format

### Technical Features
- **Modern UI/UX**: Built with Next.js 15, React 19, and Tailwind CSS
- **TypeScript**: Full type safety throughout the application
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Built-in theme switching
- **Health Monitoring**: API health checks for production deployment

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun
- Docker (for containerized deployment)
- KoboToolBox account and API credentials (for production data)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd eem-omecs
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your KoboToolBox credentials (optional for mock mode)
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality

## 🐳 Docker Deployment

### Quick Start (Production)

```bash
# Configure credentials
cp .env.example .env
# Edit .env: KOBOTOOLBOX_FORM_ID and KOBOTOOLBOX_TOKEN

# Build and start the production container
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f eem-omecs

# Access the application
# Open http://localhost:3005  (host port mapped in docker-compose.yml)
```

### Development Environment

```bash
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml logs -f eem-omecs-dev
# Open http://localhost:3000
```

### Docker Commands

| Action | Production | Development |
|--------|------------|-------------|
| Start | `docker compose up -d` | `docker compose -f docker-compose.dev.yml up -d` |
| Stop | `docker compose down` | `docker compose -f docker-compose.dev.yml down` |
| Restart | `docker compose restart` | `docker compose -f docker-compose.dev.yml restart` |
| Rebuild | `docker compose up --build -d` | `docker compose -f docker-compose.dev.yml up --build -d` |

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `KOBOTOOLBOX_FORM_ID` | Yes* | KoboToolBox form asset UID |
| `FORM_ID` | Yes* | Alias for `KOBOTOOLBOX_FORM_ID` |
| `KOBOTOOLBOX_TOKEN` | Yes* | KoboToolBox API token |
| `KOBOTOOLBOX_BASE_URL` | No | Default: `https://kf.kobotoolbox.org/api/v2` |
| `NODE_ENV` | Yes (prod) | Set to `production` for production builds |
| `NEXT_TELEMETRY_DISABLED` | No | Set to `1` to disable Next.js telemetry |
| `NEXT_PUBLIC_BASE_URL` | Conditional | Public app URL (required for scoring by submission ID in production) |

\* Required for real KoboToolBox data. Without them, use `mock=true` on API calls for testing.

Credentials are read server-side only (`src/app/config/koboToolBoxEnv.ts`). The API token is never exposed to the browser.

### Ports

| Environment | Host port | Container port |
|-------------|-----------|----------------|
| Production (Docker) | **3005** | 3000 |
| Development (Docker) | 3000 | 3000 |
| Local `npm run dev` | 3000 | — |

### Data Sources
- **CSV Data**: scoring rules, versioned per Kobo form version (mounted read-only in Docker)
  - `calculo_eem_omec.csv` — v4 (submissions from the original form)
  - `calculo_eem_omec_v7.csv` — v7 (Herramienta EEM OMEC V7)
  - `scoring_versions.json` — maps each Kobo `__version__` to a CSV; unlisted versions use `default`. After redeploying an older form, add its version id to the matching entry.
- **KoboToolBox**: Form submissions via API proxy

## 📋 Data Collection with KoboToolBox

EEM-OMECS does **not** collect field data directly. Data collection happens in **KoboToolBox** (mobile app or web form). Once submissions are sent to Kobo, EEM-OMECS fetches them via API, applies scoring rules, and displays results on the dashboard.

### Overview

```
XLSForm → KoboToolBox → Field collection (mobile/web) → EEM-OMECS dashboard
```

### 1. Publish the form in KoboToolBox

1. Log in to [https://kf.kobotoolbox.org](https://kf.kobotoolbox.org).
2. **New** → **Upload an XLSForm** (Excel file for the EEM-OMECS evaluation instrument).
3. Fix any validation errors and **Deploy** the form.
4. Copy the **Form ID** from the URL: `https://kf.kobotoolbox.org/#/forms/{FORM_ID}/summary`
5. Set `KOBOTOOLBOX_FORM_ID` in `.env`.
6. Generate an API token (**Account Settings → Security → API Token**) and set `KOBOTOOLBOX_TOKEN`.

> Field names in the XLSForm must match the `column` values in the scoring CSVs for scoring to work correctly.

### 2. Mobile collection (KoboCollect)

For **offline** field surveys on Android/iOS:

1. Install **KoboCollect** from [Google Play](https://play.google.com/store/apps/details?id=org.koboc.collect.android) or the App Store.
2. **General Settings** → set server URL: `https://kf.kobotoolbox.org`
3. **Configure** → add the surveyor's Kobo **username and password** (not the API token).
4. **Get Blank Form** → refresh → select the EEM-OMECS form → download.
5. **Fill Blank Form** → complete all sections → save as **Finalized**.
6. When connectivity is available: **Send Finalized Form** → select submissions → **Send Selected**.

### 3. Web collection (Enketo)

For online surveys (office, workshops, areas with stable internet):

1. In KoboToolBox, open the deployed form → **Collect Data** → **Online data entry only**.
2. Copy the Enketo URL (e.g. `https://ee.kobotoolbox.org/x/#...`) or QR code.
3. Share the link with surveyors.
4. Complete the form in any modern browser and click **Submit**.

> Web forms require an active internet connection. Use KoboCollect for offline field work.

### 4. View data in EEM-OMECS

1. Confirm submissions appear in KoboToolBox (**Data** tab).
2. Open the EEM-OMECS dashboard (`/`).
3. Submissions load automatically; click one to see details at `/levantamiento/[id]`.
4. Scoring is applied automatically using `calculo_eem_omec.csv`.

**Verify via API:**

```bash
curl "http://localhost:3005/api/koboToolBox?action=submissions&page=1&pageSize=5"
curl -X POST "http://localhost:3005/api/scoring" \
  -H "Content-Type: application/json" \
  -d '{"submissionId": "<UUID>"}'
```

For the full procedure in Spanish (validation, troubleshooting, permissions), see [Section 9 of the deployment guide](docs/DOCUMENTACION-DESPLIEGUE-WWF.md#9-recolección-de-datos-en-campo-kobotoolbox).

## 📁 Project Structure

```
eem-omecs/
├── calculo_eem_omec.csv           # Scoring rules v4
├── calculo_eem_omec_v7.csv        # Scoring rules v7
├── scoring_versions.json         # Kobo form version → scoring CSV
├── .env.example                  # Environment template
├── docker-compose.yml            # Production Docker Compose
├── docker-compose.dev.yml        # Development Docker Compose
├── Dockerfile                    # Production image
├── docs/
│   └── DOCUMENTACION-DESPLIEGUE-WWF.md  # Full deployment guide (ES)
└── src/app/
    ├── api/                      # REST endpoints
    ├── config/koboToolBoxEnv.ts  # Kobo env config (server-side)
    ├── components/
    ├── hooks/
    ├── levantamiento/            # Submission detail views
    └── services/                 # Business logic
```

## 📊 Application Features

### Main Dashboard
- Overview of conservation area submissions
- Real-time scoring calculations
- Statistical summaries and trends
- Quick access to detailed views

### Scoring System
- Automated evaluation based on CBD criteria
- Section-based scoring with detailed breakdowns
- Multiple scoring algorithms support
- Export capabilities for analysis

## 🏥 Health Monitoring

The production container includes health checks at `/api/health`:

```bash
curl http://localhost:3005/api/health
```

## 🚨 Troubleshooting

**KoboToolBox not configured (HTTP 503):**
- Set `KOBOTOOLBOX_FORM_ID` and `KOBOTOOLBOX_TOKEN` in `.env`
- Or use mock mode: `/api/koboToolBox?action=submissions&mock=true`

**Submissions not appearing:**
- Verify data was sent from KoboCollect / Enketo
- Check credentials and Form ID in `.env`
- Review logs: `docker compose logs eem-omecs`

**Scoring empty or zero:**
- Ensure XLSForm field names match `calculo_eem_omec.csv` column `column`

**Build / runtime issues:**
- Check container logs and port availability (3005 in production Docker)

See [docs/DOCUMENTACION-DESPLIEGUE-WWF.md](docs/DOCUMENTACION-DESPLIEGUE-WWF.md) for the complete troubleshooting guide.

## 🧹 Cleanup

```bash
docker compose down --volumes --remove-orphans
docker system prune -a   # removes unused images
```

## 📚 Learn More

- [Deployment guide (WWF — Spanish)](docs/DOCUMENTACION-DESPLIEGUE-WWF.md)
- [KoboToolBox Documentation](https://support.kobotoolbox.org/)
- [KoboCollect User Guide](https://support.kobotoolbox.org/data-collection/start/enketo-web-forms/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com)

## 📄 License

This project is part of the WWF Ecuador conservation initiatives.

---

**Built with ❤️ for conservation in Ecuador**
