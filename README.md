# Project HandoverKey

**A stupidly secure, open-source digital legacy platform with dead man's switch functionality.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security: Verified](https://img.shields.io/badge/Security-Verified-green.svg)](https://github.com/handoverkey/security)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/handoverkey/actions)

## What is HandoverKey?

HandoverKey is a zero-knowledge, end-to-end encrypted digital legacy platform that ensures your digital assets are securely passed to your trusted contacts if something happens to you. Think of it as a "dead man's switch" for your digital life.

### Key Features

- **Zero-Knowledge Encryption**: Your data is encrypted client-side before it ever reaches our servers
- **Dead Man's Switch**: Automatic handover after configurable inactivity period (default: 90 days)
- **Multi-Party Handover**: Require multiple trusted contacts to confirm before release
- **Secure Vault Management**: Full-featured web interface for managing encrypted digital assets
- **Cross-Platform**: Web application with mobile and CLI tools planned
- **Hardware Key Support**: YubiKey, FIDO2, and other security keys (planned)
- **Audit Trail**: Complete transparency of all access attempts and system events
- **Open Source**: Full transparency - inspect, verify, and contribute

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Local Development

```bash
# Clone the repository
git clone https://github.com/handoverkey/handoverkey.git
cd HandoverKey

# Install dependencies
npm install

# Start all services
chmod +x scripts/start-all.sh
./scripts/start-all.sh

# Stop all services
chmod +x scripts/stop-all.sh
./scripts/stop-all.sh
```

Visit `http://localhost:3000` to access the web application.

## Current Implementation Status

### Production Ready
- **Vault Management UI**: Complete React-based interface with 184 tests passing
- **Client-Side Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Dead Man's Switch Backend**: Comprehensive inactivity monitoring and handover system
- **Security Features**: Input sanitization, rate limiting, comprehensive audit logging

### In Development
- User threshold configuration endpoints
- Emergency override procedures

### Planned Features
- Mobile applications (React Native)
- CLI tools
- Hardware security key integration
- Multi-language support

## Project Structure

```
handoverkey/
├── apps/
│   └── web/                 # React web application (production-ready)
├── packages/
│   ├── core/                # Core encryption and business logic
│   ├── api/                 # Backend API server with dead man's switch
│   ├── database/            # Database schemas and migrations
│   └── shared/              # Shared types and utilities
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
└── tests/                   # End-to-end tests
```

## Security

HandoverKey uses zero-knowledge, end-to-end encryption with client-side AES-256-GCM encryption and PBKDF2 key derivation. See [Architecture Guide](docs/architecture.md) for detailed security implementation.

## Documentation

- [Architecture Guide](docs/architecture.md)
- [Security Model](docs/security.md)
- [API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Email: support@handoverkey.com
- Issues: [GitHub Issues](https://github.com/handoverkey/handoverkey/issues)
- Docs: [Documentation](https://github.com/handoverkey/handoverkey/docs)

## Disclaimer

HandoverKey is designed for digital legacy planning and should not be used as a replacement for legal estate planning. Always consult with legal professionals for proper estate planning.

---

**Made by the HandoverKey community**
