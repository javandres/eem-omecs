# EEM-OMECS - Ecuador

**Evaluación de la Efectividad de Manejo de Áreas de Conservación con visión OMEC – Ecuador**

A comprehensive web application for evaluating the effectiveness of conservation area management managed by various actors, including indigenous peoples and nationalities, local communities, civil society organizations, private sector, and local governments, who aspire to be recognized as Other Effective Area-based Conservation Measures (OMEC) according to the criteria established by the Convention on Biological Diversity (CBD).

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

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd eem-omecs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality

## 🐳 Docker Deployment

### Quick Start (Production)

```bash
# Build and start the production container
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f eem-omecs

# Access the application
# Open http://localhost:3000
```

### Development Environment

```bash
# Build and start the development container
docker compose -f docker-compose.dev.yml up --build -d

# Check status
docker compose -f docker-compose.dev.yml ps

# View logs
docker compose -f docker-compose.dev.yml logs -f eem-omecs-dev
```

### Docker Commands

| Action | Production | Development |
|--------|------------|-------------|
| Start | `docker compose up -d` | `docker compose -f docker-compose.dev.yml up -d` |
| Stop | `docker compose down` | `docker compose -f docker-compose.dev.yml down` |
| Restart | `docker compose restart` | `docker compose -f docker-compose.dev.yml restart` |
| Rebuild | `docker compose up --build -d` | `docker compose -f docker-compose.dev.yml up --build -d` |

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # Reusable UI components
│   ├── csv-viewer/        # CSV data visualization
│   ├── hooks/            # Custom React hooks
│   ├── levantamiento/     # Individual submission views
│   ├── services/          # Business logic services
│   ├── test-scoring-ui/   # Scoring test interface
│   ├── types/            # TypeScript type definitions
│   └── layout.tsx        # Root layout component
├── Dockerfile             # Production Docker configuration
├── Dockerfile.dev         # Development Docker configuration
├── docker-compose.yml     # Production Docker Compose
├── docker-compose.dev.yml # Development Docker Compose
└── next.config.js        # Next.js configuration
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Set to `production` for production builds
- `NEXT_TELEMETRY_DISABLED`: Disables Next.js telemetry

### Ports
- **Application**: 3000 (mapped to host port 3000)

### Data Sources
- **CSV Data**: The `calculo_eem_omec.csv` file is mounted as read-only
- **KoboToolBox**: Integration for form submission data

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

### Data Management
- Integration with KoboToolBox
- CSV data visualization and analysis
- Submission tracking and management
- Historical data access

## 🏥 Health Monitoring

The production container includes health checks that monitor the application status at `/api/health`.

## 🚨 Troubleshooting

### Common Issues

**Build Issues:**
- Ensure all dependencies are properly installed
- Check Next.js configuration
- Verify Dockerfile syntax

**Runtime Issues:**
- Check container logs: `docker compose logs eem-omecs`
- Verify port 3000 is not already in use
- Ensure CSV file exists and is accessible

**Performance Issues:**
- Consider using a reverse proxy for SSL termination
- Implement proper logging and monitoring
- Use Docker volumes for persistent data if needed

### Getting Help

1. Check the logs for error messages
2. Verify environment configuration
3. Ensure all required files are present
4. Check Docker container status

## 🚀 Production Deployment

### Security Considerations
- Run containers as non-root users
- Implement proper logging and monitoring
- Use reverse proxy for SSL termination
- Regular security updates

### Scaling
- Use Docker Swarm or Kubernetes for production scaling
- Implement load balancing
- Consider horizontal scaling strategies

### Monitoring
- Health check endpoints
- Log aggregation
- Performance metrics
- Error tracking

## 🧹 Cleanup

```bash
# Remove all containers and networks
docker compose down --volumes --remove-orphans

# Remove all images
docker system prune -a
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Docker Documentation](https://docs.docker.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the WWF Ecuador conservation initiatives.

---

**Built with ❤️ for conservation in Ecuador**
