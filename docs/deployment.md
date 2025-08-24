# HandoverKey - Deployment Guide

## 1. Introduction

This guide provides instructions for deploying the HandoverKey project. It covers local development setup, staging environment deployment, and considerations for production.

## 2. Local Development Setup

### 2.1 Prerequisites

- Docker & Docker Compose
- Node.js 22+
- npm (Node Package Manager)
- Git

### 2.2 Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/mahiuddinalkamal/handoverkey.git
   cd handoverkey
   ```

2. **Install Node.js dependencies:**

   ```bash
   npm install
   ```

3. **Prepare environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env if necessary (e.g., change database credentials)
   ```

4. **Start Docker services (PostgreSQL, Redis):**

   ```bash
   docker-compose up -d
   ```

   This will start the PostgreSQL database and Redis cache in Docker containers.

5. **Run database migrations:**

   ```bash
   # Navigate to the database package
   cd packages/database
   # Run migrations (assuming a migration script exists, e.g., using TypeORM or Knex)
   npm run migrate
   # Or if using a custom script:
   node dist/migrate.js
   cd ../..
   ```

   _Note: The exact migration command depends on the database ORM/migration tool used in `packages/database`._

6. **Start all application services:**

   ```bash
   chmod +x scripts/start-all.sh
   ./scripts/start-all.sh
   ```

   This script will typically build and start the `api`, `web`, `mobile` (development server), and `cli` (if applicable) services.

7. **Access the web application:**
   Open your browser and navigate to `http://localhost:3000` (or the port configured in `apps/web/vite.config.ts`).

### 2.3 Stopping Services

To stop all running Docker containers and Node.js processes:

```bash
chmod +x scripts/stop-all.sh
./scripts/stop-all.sh
```

## 3. Staging Environment Deployment

A staging environment mirrors the production environment and is used for testing new features before release.

### 3.1 Prerequisites

- Cloud Provider Account (AWS, GCP, Azure)
- Kubernetes Cluster (EKS, GKE, AKS)
- Docker Registry (ECR, GCR, Docker Hub)
- CI/CD Pipeline (GitHub Actions, GitLab CI, Jenkins)
- Helm (for Kubernetes deployments)

### 3.2 Deployment Steps (Conceptual)

1. **Containerize Applications:**
   - Ensure each microservice (`api`, `web`, etc.) has a `Dockerfile`.
   - Build Docker images for each service:

     ```bash
     # API service (Node.js backend)
     docker build -t your-registry/handoverkey-api:latest -f packages/api/Dockerfile .

     # Web application (React frontend)
     docker build -t your-registry/handoverkey-web:latest -f apps/web/Dockerfile .

     # Core services
     docker build -t your-registry/handoverkey-core:latest -f packages/core/Dockerfile .
     ```

2. **Push Images to Registry:**

   ```bash
   docker push your-registry/api:latest
   docker push your-registry/web:latest
   # ...
   ```

3. **Kubernetes Deployment:**
   - Use Helm charts or Kubernetes YAML manifests to define deployments, services, ingresses, and persistent volumes.
   - Example Helm command:
     ```bash
     helm upgrade --install handoverkey-staging ./helm/handoverkey \
       --namespace staging \
       --set api.image.tag=latest \
       --set web.image.tag=latest \
       --set database.host=your-staging-db-endpoint \
       --set redis.host=your-staging-redis-endpoint \
       -f ./helm/handoverkey/values-staging.yaml
     ```
   - Ensure external database (PostgreSQL) and Redis instances are provisioned and configured.

4. **Configure Ingress/Load Balancer:**
   - Set up an Ingress controller (e.g., NGINX Ingress) or a cloud load balancer to route external traffic to the Kubernetes services.
   - Configure TLS certificates (e.g., using Cert-Manager).

5. **CI/CD Integration:**
   - Automate the build, test, and deployment process using GitHub Actions or similar.
   - On every push to `develop` branch, trigger a deployment to staging.

## 4. Production Environment Deployment

Production deployment requires robust infrastructure, security, and monitoring.

### 4.1 Key Considerations

- **High Availability**: Deploy services across multiple availability zones/regions.
- **Scalability**: Implement auto-scaling for microservices based on load.
- **Security**:
  - **Network**: VPCs, private subnets, security groups, WAF, DDoS protection.
  - **Secrets Management**: Use dedicated secrets management services (e.g., AWS Secrets Manager, HashiCorp Vault).
  - **TLS**: Enforce TLS 1.3 everywhere.
  - **Regular Audits**: Conduct security audits and penetration tests.
- **Monitoring & Logging**:
  - **Centralized Logging**: ELK Stack (Elasticsearch, Logstash, Kibana) or cloud-native logging.
  - **Metrics**: Prometheus + Grafana for application and infrastructure metrics.
  - **Alerting**: Configure alerts for critical issues (e.g., high error rates, service downtime).
  - **Tracing**: Distributed tracing (e.g., Jaeger, OpenTelemetry) for microservices.
- **Backup & Disaster Recovery**:
  - **Automated Backups**: Regular, encrypted backups of databases and persistent storage.
  - **Point-in-Time Recovery**: For databases.
  - **Disaster Recovery Plan**: Documented RTO/RPO and recovery procedures.
- **Compliance**: Ensure adherence to relevant regulations (GDPR, CCPA, SOC 2).

### 4.2 Recommended Production Stack

- **Cloud Provider**: AWS, Google Cloud, or Azure
- **Container Orchestration**: Kubernetes (EKS, GKE, AKS)
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **Cache**: Managed Redis (AWS ElastiCache, Google Cloud Memorystore)
- **Object Storage**: AWS S3, Google Cloud Storage (for encrypted files)
- **Message Queue**: Managed RabbitMQ or Kafka (e.g., AWS MSK)
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Monitoring**: Prometheus, Grafana, ELK Stack, Jaeger
- **Security**: Cloud WAF, KMS, Secrets Manager

### 4.3 Deployment Strategy

- **Blue/Green Deployment**: Minimize downtime during updates.
- **Canary Releases**: Gradually roll out new versions to a small subset of users.
- **Automated Rollbacks**: Ability to quickly revert to a previous stable version if issues arise.

---

**Last Updated**: Aug 24, 2025
**Version**: 1.0
