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
- **Cross-Platform**: Web, mobile apps, and CLI tools
- **Hardware Key Support**: YubiKey, FIDO2, and other security keys
- **Audit Trail**: Complete transparency of all access attempts and system events
- **Open Source**: Full transparency - inspect, verify, and contribute

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Local Development

```bash
# Clone the repository
git clone https://github.com/HandoverKey/HandoverKey.git
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

## Project Structure

```
handoverkey/
├── apps/
│   ├── web/                 # React web application
│   ├── mobile/              # React Native mobile app
│   └── cli/                 # Command-line interface
├── packages/
│   ├── core/                # Core encryption and business logic
│   ├── api/                 # Backend API server
│   ├── database/            # Database schemas and migrations
│   └── shared/              # Shared types and utilities
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
└── tests/                   # End-to-end tests
```

## Security Architecture

### Encryption Model

1. **Client-Side Encryption**: All data is encrypted using AES-256-GCM before upload
2. **Key Derivation**: Master key derived from user password using PBKDF2
3. **Secret Sharing**: Shamir's Secret Sharing for multi-party handover
4. **Zero-Knowledge**: Server never sees plaintext data

### Security Features

- End-to-end encryption (E2EE)
- Hardware security key support
- Multi-factor authentication
- Rate limiting and DDoS protection
- Regular security audits
- Open source for transparency

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
- Discord: [Join our community](https://discord.gg/handoverkey)
- Issues: [GitHub Issues](https://github.com/mahiuddinalkamal/handoverkey/issues)
- Docs: [Documentation](https://docs.handoverkey.com)

## Disclaimer

HandoverKey is designed for digital legacy planning and should not be used as a replacement for legal estate planning. Always consult with legal professionals for proper estate planning.

---

**Made with ❤️ by the HandoverKey community** 
