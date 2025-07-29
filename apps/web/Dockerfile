# Multi-stage build for HandoverKey Web App
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY tsconfig.json ./

# Build shared package first
RUN npm run build --workspace=packages/shared

# Build the web application
ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:3001
RUN npm run build --workspace=apps/web

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:3001;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy (for development)
    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security: deny access to sensitive files
    location ~ /\. {
        deny all;
    }
}
EOF

# Copy built application
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S handoverkey -u 1001

# Change ownership of nginx directories
RUN chown -R handoverkey:nodejs /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html

# Switch to non-root user
USER handoverkey

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]