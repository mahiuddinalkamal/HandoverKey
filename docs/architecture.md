# HandoverKey - System Architecture

## 1. Overview

HandoverKey follows a **zero-knowledge, end-to-end encrypted architecture** where the server never has access to plaintext user data. This document outlines the secure system design that ensures maximum privacy and security.

## 2. High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   CLI Client    │
│   (React/TS)    │    │  (React Native) │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (Rate Limiting)│
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Authentication │
                    │   Service       │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Service   │    │  Vault Service  │    │ Handover Service│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Event Bus      │
                    │  (RabbitMQ)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │     Redis       │    │  Object Storage │
│  (User Data)    │    │   (Cache/Queue) │    │  (Encrypted)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 3. Security Architecture

### 3.1 Zero-Knowledge Design

```
User Device                    Server                    Successor Device
     │                            │                            │
     │ 1. Generate Master Key     │                            │
     │    (PBKDF2)               │                            │
     │                            │                            │
     │ 2. Encrypt Data            │                            │
     │    (AES-256-GCM)          │                            │
     │                            │                            │
     │ 3. Upload Encrypted Data   │                            │
     │    (Never Plaintext)      │                            │
     │                            │                            │
     │                            │ 4. Store Encrypted Data    │
     │                            │    (Cannot Decrypt)       │
     │                            │                            │
     │                            │ 5. Trigger Handover       │
     │                            │    (After Inactivity)     │
     │                            │                            │
     │                            │ 6. Send Encrypted Data    │
     │                            │    to Successors          │
     │                            │                            │
     │                            │                            │ 7. Decrypt Data
     │                            │                            │    (With Shared Key)
```

### 3.2 Encryption Flow

#### 3.2.1 Key Derivation
```typescript
// Client-side key derivation
const deriveMasterKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const masterKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
  
  return crypto.subtle.importKey(
    'raw',
    masterKey,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
};
```

#### 3.2.2 Data Encryption
```typescript
// Client-side data encryption
const encryptData = async (data: string, masterKey: CryptoKey): Promise<EncryptedData> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    masterKey,
    encodedData
  );
  
  return {
    data: new Uint8Array(encryptedData),
    iv: iv,
    algorithm: 'AES-GCM'
  };
};
```

### 3.3 Shamir's Secret Sharing

For multi-party handover, we use Shamir's Secret Sharing to split the master key:

```typescript
// Split master key for multiple successors
const splitMasterKey = (masterKey: string, totalShares: number, requiredShares: number): string[] => {
  // Use a cryptographically secure implementation of Shamir's Secret Sharing
  // Each share can reconstruct the master key when combined with others
  return shamirShare(masterKey, totalShares, requiredShares);
};

// Reconstruct master key from shares
const reconstructMasterKey = (shares: string[]): string => {
  return shamirReconstruct(shares);
};
```

## 4. Microservices Architecture

### 4.1 Service Breakdown

#### 4.1.1 Authentication Service
- **Purpose**: Handle user authentication and session management
- **Responsibilities**:
  - User registration and login
  - JWT token management
  - 2FA verification
  - Hardware key authentication (WebAuthn)
  - Rate limiting and brute force protection

#### 4.1.2 User Service
- **Purpose**: Manage user profiles and preferences
- **Responsibilities**:
  - User profile management
  - Successor management
  - Notification preferences
  - Account settings

#### 4.1.3 Vault Service
- **Purpose**: Handle encrypted data storage and retrieval
- **Responsibilities**:
  - Encrypted data storage
  - Data categorization and tagging
  - Search functionality (encrypted search)
  - File upload/download
  - Version control

#### 4.1.4 Handover Service
- **Purpose**: Manage dead man's switch functionality
- **Responsibilities**:
  - Inactivity detection
  - Reminder scheduling
  - Handover execution
  - Successor notification
  - Audit logging

#### 4.1.5 Notification Service
- **Purpose**: Handle all communication with users
- **Responsibilities**:
  - Email notifications
  - SMS notifications
  - Push notifications
  - Reminder scheduling
  - Template management

### 4.2 Service Communication

```typescript
// Event-driven communication
interface HandoverEvent {
  userId: string;
  eventType: 'INACTIVITY_DETECTED' | 'HANDOVER_TRIGGERED' | 'SUCCESSOR_NOTIFIED';
  timestamp: Date;
  metadata: Record<string, any>;
}

// Publish event to message queue
await eventBus.publish('handover.events', handoverEvent);

// Subscribe to events
await eventBus.subscribe('handover.events', async (event: HandoverEvent) => {
  switch (event.eventType) {
    case 'INACTIVITY_DETECTED':
      await notificationService.sendReminder(event.userId);
      break;
    case 'HANDOVER_TRIGGERED':
      await vaultService.prepareHandover(event.userId);
      break;
  }
});
```

## 5. Database Design

### 5.1 Schema Overview

```sql
-- Users table (minimal data, no sensitive information)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt BYTEA NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Successors table
CREATE TABLE successors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  verification_token VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  handover_delay_days INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Encrypted vault data
CREATE TABLE vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Handover events
CREATE TABLE handover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  triggered_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Data Encryption Strategy

- **At Rest**: Database-level encryption (PostgreSQL pgcrypto)
- **In Transit**: TLS 1.3 for all connections
- **Application Level**: Client-side encryption before storage

## 6. API Design

### 6.1 RESTful API Structure

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/2fa/verify
POST   /api/v1/auth/webauthn/register
POST   /api/v1/auth/webauthn/authenticate

GET    /api/v1/users/profile
PUT    /api/v1/users/profile
GET    /api/v1/users/successors
POST   /api/v1/users/successors
PUT    /api/v1/users/successors/:id
DELETE /api/v1/users/successors/:id

GET    /api/v1/vault/entries
POST   /api/v1/vault/entries
GET    /api/v1/vault/entries/:id
PUT    /api/v1/vault/entries/:id
DELETE /api/v1/vault/entries/:id
POST   /api/v1/vault/search

GET    /api/v1/handover/status
POST   /api/v1/handover/check-in
GET    /api/v1/handover/audit-logs

GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
```

### 6.2 API Security

```typescript
// JWT middleware
const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Rate limiting middleware
const rateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

## 7. Deployment Architecture

### 7.1 Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (NGINX)                    │
└─────────────────────────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Gateway    │    │  API Gateway    │    │  API Gateway    │
│   (Instance 1)  │    │   (Instance 2)  │    │   (Instance 3)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌─────────────────┐
                    │  Service Mesh   │
                    │   (Istio)       │
                    └─────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Service   │    │  Vault Service  │    │ Handover Service│
│   (Pods)        │    │    (Pods)       │    │    (Pods)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │     Redis       │    │  Object Storage │
│   (Primary)     │    │   (Cluster)     │    │   (S3/Cloud)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
┌─────────────────┐
│  PostgreSQL     │
│  (Replica)      │
└─────────────────┘
```

### 7.2 Security Layers

1. **Network Security**
   - VPC with private subnets
   - Security groups and NACLs
   - WAF for DDoS protection
   - VPN access for administration

2. **Application Security**
   - Container scanning
   - Runtime security monitoring
   - Secrets management (AWS Secrets Manager)
   - Certificate management

3. **Data Security**
   - Database encryption at rest
   - Backup encryption
   - Data retention policies
   - Access logging

## 8. Monitoring and Observability

### 8.1 Monitoring Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │    │     Grafana     │    │    AlertManager │
│   (Metrics)     │    │   (Dashboards)  │    │   (Alerts)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌─────────────────┐
                    │     ELK Stack    │
                    │   (Logging)      │
                    └─────────────────┘
                                │
                    ┌─────────────────┐
                    │   Jaeger        │
                    │ (Distributed    │
                    │  Tracing)       │
                    └─────────────────┘
```

### 8.2 Key Metrics

- **Application Metrics**: Response time, error rate, throughput
- **Security Metrics**: Failed login attempts, suspicious activities
- **Business Metrics**: User registrations, handover events
- **Infrastructure Metrics**: CPU, memory, disk usage

## 9. Disaster Recovery

### 9.1 Backup Strategy

- **Database**: Automated daily backups with point-in-time recovery
- **Application Data**: Encrypted backups to multiple regions
- **Configuration**: Infrastructure as Code with version control
- **Documentation**: Comprehensive runbooks and procedures

### 9.2 Recovery Procedures

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Automated failover**: Multi-region deployment
4. **Manual procedures**: Documented escalation paths

## 10. Compliance and Auditing

### 10.1 Compliance Framework

- **SOC 2 Type II**: Annual audit and certification
- **GDPR**: Data protection and privacy compliance
- **CCPA**: California privacy law compliance
- **ISO 27001**: Information security management

### 10.2 Audit Trail

```typescript
// Comprehensive audit logging
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  metadata: Record<string, any>;
  hash: string; // Cryptographic hash for integrity
}

// Immutable audit logs
const createAuditLog = async (log: AuditLog): Promise<void> => {
  log.hash = await generateHash(log);
  await auditService.create(log);
  
  // Also store in blockchain for immutability
  await blockchainService.store(log);
};
```

This architecture ensures maximum security, privacy, and reliability while maintaining the zero-knowledge principle that users' data is never accessible to the service provider. 