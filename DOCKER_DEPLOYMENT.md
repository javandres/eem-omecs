# Docker Deployment Guide

This guide explains how to deploy the EEM-OMECS application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Quick Start

### Production Deployment

1. **Build and start the production container:**
   ```bash
   docker compose up --build -d
   ```

2. **Check the status:**
   ```bash
   docker compose ps
   ```

3. **View logs:**
   ```bash
   docker compose logs -f eem-omecs
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

### Development Deployment

1. **Build and start the development container:**
   ```bash
   docker compose -f docker-compose.dev.yml up --build -d
   ```

2. **Check the status:**
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

3. **View logs:**
   ```bash
   docker compose -f docker-compose.dev.yml logs -f eem-omecs-dev
   ```

## Docker Commands

### Production
- **Start:** `docker compose up -d`
- **Stop:** `docker compose down`
- **Restart:** `docker compose restart`
- **Rebuild:** `docker compose up --build -d`

### Development
- **Start:** `docker compose -f docker-compose.dev.yml up -d`
- **Stop:** `docker compose -f docker-compose.dev.yml down`
- **Restart:** `docker compose -f docker-compose.dev.yml restart`
- **Rebuild:** `docker compose -f docker-compose.dev.yml up --build -d`

## Configuration

### Environment Variables
The application uses the following environment variables:
- `NODE_ENV`: Set to `production` for production builds
- `NEXT_TELEMETRY_DISABLED`: Disables Next.js telemetry

### Ports
- **Application:** 3000 (mapped to host port 3000)

### Volumes
- **CSV Data:** The `calculo_eem_omec.csv` file is mounted as read-only

## Health Checks

The production container includes a health check that monitors the application status at `/api/health`.

## Troubleshooting

### Build Issues
If you encounter build errors:
1. Ensure all dependencies are properly installed
2. Check that the Next.js configuration is correct
3. Verify that the Dockerfile syntax is valid

### Runtime Issues
If the container fails to start:
1. Check the logs: `docker compose logs eem-omecs`
2. Verify port 3000 is not already in use
3. Ensure the CSV file exists and is accessible

### Performance Issues
For production deployments:
1. Consider using a reverse proxy (Nginx) for SSL termination
2. Implement proper logging and monitoring
3. Use Docker volumes for persistent data if needed

## Production Considerations

1. **Security:** Run containers as non-root users
2. **Monitoring:** Implement proper logging and health checks
3. **Scaling:** Use Docker Swarm or Kubernetes for production scaling
4. **Backup:** Implement regular backup strategies for data volumes

## Cleanup

To remove all containers and networks:
```bash
docker compose down --volumes --remove-orphans
```

To remove all images:
```bash
docker system prune -a
```
