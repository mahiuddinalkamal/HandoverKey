# HandoverKey - Security Model

## 1. Introduction

This document details the security model of HandoverKey, a zero-knowledge, end-to-end encrypted digital legacy platform. Our primary goal is to ensure that user data remains private and inaccessible to anyone, including the HandoverKey team, at all times.

## 2. Core Security Principles

### 2.1 Zero-Knowledge
- **Definition**: The server never has access to plaintext user data. All sensitive information is encrypted client-side before being transmitted or stored.
- **Implementation**:
    - **Client-Side Encryption**: All user-provided data (passwords, documents, notes) is encrypted on the user's device using AES-256-GCM.
    - **Key Derivation**: Master encryption keys are derived from the user's password using PBKDF2 with a high iteration count and a unique salt.
    - **No Server-Side Decryption**: The server stores only encrypted blobs and cannot decrypt them.

### 2.2 End-to-End Encryption (E2EE)
- **Definition**: Data is encrypted on the sender's device and can only be decrypted by the intended recipient's device.
- **Implementation**:
    - **User to Server**: Data is encrypted client-side before upload.
    - **Server to Successor**: Encrypted data is transmitted to successors, who then decrypt it on their device using their derived key shares.

### 2.3 Least Privilege
- **Definition**: Every module, process, and user is granted only the minimum permissions necessary to perform its function.
- **Implementation**:
    - **Microservices**: Each service (Auth, Vault, Handover) has distinct, limited access to resources.
    - **Database Access**: Services connect to the database with specific, restricted user roles.
    - **API Keys**: Limited scope API keys for third-party integrations.

### 2.4 Defense in Depth
- **Definition**: Multiple layers of security controls are placed throughout the system to provide redundancy in case one control fails.
- **Implementation**:
    - **Network**: Firewalls, WAF, DDoS protection.
    - **Application**: Input validation, secure coding practices, rate limiting.
    - **Data**: Client-side encryption, database encryption at rest, regular backups.
    - **Operational**: Access controls, audit logging, security monitoring.

## 3. Encryption Architecture

### 3.1 Key Management

#### 3.1.1 Master Key Derivation
- **Process**:
    1. User enters password.
    2. A unique, cryptographically secure salt is generated client-side for each user.
    3. PBKDF2 (Password-Based Key Derivation Function 2) is used to derive a master encryption key from the password and salt.
    - **Parameters**:
        - **Algorithm**: SHA-256
        - **Iterations**: 100,000+ (configurable, subject to performance testing)
        - **Key Length**: 256 bits (for AES-256-GCM)
- **Storage**: The derived master key is never stored. It is re-derived on each login. The salt is stored securely on the server alongside the user's encrypted data, as it is non-sensitive.

#### 3.1.2 Data Encryption Keys (DEKs)
- **Process**: For each piece of data (e.g., a password entry, a document), a unique Data Encryption Key (DEK) is generated.
- **Encryption**: The DEK is then encrypted using the user's master key.
- **Storage**: The encrypted DEK is stored alongside the encrypted data. This allows for efficient re-encryption if the master key changes (e.g., password change) without re-encrypting all data.

### 3.2 Data Encryption

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Why AES-GCM**: Provides both confidentiality (encryption) and authenticity (integrity and authentication) of the data.
- **Initialization Vector (IV)**: A unique, cryptographically random IV is generated for each encryption operation. The IV is non-secret and transmitted alongside the ciphertext.
- **Associated Data**: Optional, but recommended for binding ciphertext to specific contexts (e.g., user ID, timestamp) to prevent tampering.

### 3.3 Shamir's Secret Sharing (SSS)

- **Purpose**: To enable multi-party handover without any single successor having full control or knowledge of the master key.
- **Process**:
    1. The user's master key (or a key derived from it specifically for handover) is split into `N` shares.
    2. A threshold `K` is set, meaning any `K` out of `N` shares are required to reconstruct the original key.
    3. Each successor receives one share.
- **Implementation**: A robust, audited SSS library will be used. The shares themselves are encrypted with the successor's public key (if available) or a temporary key exchanged securely.

## 4. Authentication and Access Control

### 4.1 User Authentication

- **Password Hashing**: User passwords are never stored in plaintext. Instead, they are hashed using a strong, slow hashing algorithm (e.g., Argon2, bcrypt) with a unique salt for each user.
- **Multi-Factor Authentication (MFA)**:
    - **TOTP (Time-based One-Time Password)**: Users can enable TOTP using authenticator apps.
    - **WebAuthn (FIDO2)**: Support for hardware security keys (e.g., YubiKey, Ledger) for strong, phishing-resistant authentication.
- **Session Management**:
    - **JWT (JSON Web Tokens)**: Used for stateless authentication. Tokens are short-lived and refreshed securely.
    - **Refresh Tokens**: Long-lived refresh tokens are stored securely (e.g., HTTP-only cookies) and used to obtain new access tokens.
- **Rate Limiting**: Implemented at the API Gateway and individual service levels to prevent brute-force attacks and DDoS.

### 4.2 Authorization

- **Role-Based Access Control (RBAC)**: Users are assigned roles (e.g., `user`, `admin`, `successor`) with specific permissions.
- **Granular Permissions**: Access to vault entries is tied to the user ID and encryption keys. Successors only gain access after the dead man's switch is triggered and they provide their key shares.

## 5. Data Security

### 5.1 Data at Rest

- **Database Encryption**: PostgreSQL data at rest will be encrypted using native database encryption features (e.g., `pgcrypto` for specific columns, or transparent data encryption at the volume level).
- **Object Storage**: Encrypted blobs (vault entries, files) stored in object storage (e.g., AWS S3) will utilize server-side encryption with customer-provided keys (SSE-C) or KMS-managed keys (SSE-KMS).

### 5.2 Data in Transit

- **TLS 1.3**: All communication between clients and servers, and between microservices, will be encrypted using TLS 1.3.
- **Strict HSTS**: HTTP Strict Transport Security (HSTS) will be enforced to prevent downgrade attacks.

### 5.3 Data Integrity

- **Hashing**: Cryptographic hashes (e.g., SHA-256) are used to verify the integrity of data, especially for audit logs and file uploads.
- **Digital Signatures**: Used for critical operations (e.g., handover confirmation by successors) to ensure authenticity and non-repudiation.

## 6. Operational Security

### 6.1 Secure Development Lifecycle (SDL)

- **Threat Modeling**: Regular threat modeling sessions to identify and mitigate potential vulnerabilities.
- **Code Reviews**: All code changes undergo peer review with a focus on security.
- **Static Application Security Testing (SAST)**: Automated tools to identify common vulnerabilities in source code.
- **Dynamic Application Security Testing (DAST)**: Automated tools to test the running application for vulnerabilities.

### 6.2 Infrastructure Security

- **Cloud Security**: Adherence to cloud provider (AWS/GCP) security best practices.
- **Network Segmentation**: Microservices deployed in isolated network segments.
- **Vulnerability Management**: Regular scanning and patching of servers and dependencies.
- **Secrets Management**: Environment variables and sensitive configurations managed securely (e.g., Kubernetes Secrets, AWS Secrets Manager).

### 6.3 Monitoring and Logging

- **Comprehensive Audit Logs**: All security-relevant events (logins, data access, handover triggers) are logged with immutable timestamps and cryptographic hashes.
- **Real-time Monitoring**: Security Information and Event Management (SIEM) system to detect and alert on suspicious activities.
- **Intrusion Detection/Prevention Systems (IDS/IPS)**: Network and host-based systems to identify and block malicious traffic.

### 6.4 Incident Response

- **Incident Response Plan**: A documented plan for identifying, containing, eradicating, recovering from, and post-analyzing security incidents.
- **Regular Drills**: Periodic testing of the incident response plan.

## 7. Compliance and Audits

### 7.1 Regulatory Compliance

- **GDPR (General Data Protection Regulation)**: Compliance with data privacy and protection regulations for EU citizens.
- **CCPA (California Consumer Privacy Act)**: Compliance with privacy regulations for California residents.
- **HIPAA (Health Insurance Portability and Accountability Act)**: (If applicable, for health-related data)

### 7.2 Certifications and Audits

- **SOC 2 Type II**: Annual independent audit of security controls.
- **Penetration Testing**: Regular third-party penetration tests to identify and remediate vulnerabilities.
- **Bug Bounty Program**: Encouraging security researchers to find and report vulnerabilities.

## 8. Dead Man's Switch Security

### 8.1 Inactivity Detection

- **Secure Check-ins**: User activity (logins, manual check-ins) is securely recorded and cryptographically signed to prevent tampering.
- **Decentralized Verification**: (Future consideration) Explore blockchain or decentralized ledger technologies for immutable activity logs.

### 8.2 Handover Process

- **Multi-Party Confirmation**: For multi-party handover, all required successors must provide their key shares and confirm the handover.
- **Successor Verification**: Successors are verified through email, and optionally through MFA, before they can access their key shares or the encrypted data.
- **Audit Trail**: Every step of the handover process is meticulously logged and auditable.

## 9. Disclaimer

While HandoverKey employs state-of-the-art security measures, no system is entirely immune to all forms of attack. Users are responsible for choosing strong, unique passwords and enabling multi-factor authentication. HandoverKey is designed to be a secure digital legacy platform but should not be considered a substitute for legal estate planning.

---

**Last Updated**: July 26, 2025
**Version**: 1.0
