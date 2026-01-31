# ConsentVault DPI - Backend

**DPDP-Compliant Consent Management System with Zero-Knowledge Proofs**

ConsentVault DPI is a production-ready FastAPI backend implementing India's Digital Personal Data Protection (DPDP) Act 2023 requirements. It provides verifiable consent management using Zero-Knowledge Proofs (ZKPs), dual-database architecture for separation of proof and document storage, and comprehensive audit logging.

---

## Features

- ✅ **Zero-Knowledge Proof Verification** - Onboard users with ZKP-verified identity without storing raw credentials
- ✅ **Dual-Database Architecture** - Public DB (TimescaleDB) for proofs/logs, Private DB (PostgreSQL) for encrypted documents with Row-Level Security
- ✅ **DPDP-Compliant Consent Artefacts** - HMAC-signed consent tokens with timestamp and purpose binding
- ✅ **Revocation Mechanism** - Redis-backed blacklist with 7-day TTL and database persistence
- ✅ **Comprehensive Audit Logging** - Immutable TimescaleDB hypertable with IP, user-agent, and action tracking
- ✅ **Admin API Key Management** - JWT-based admin authentication with API key CRUD operations
- ✅ **Production-Ready Security** - AES-256-CBC encryption, bcrypt password hashing, JWT tokens with configurable expiry
- ✅ **Health Checks** - Multi-service health endpoint testing all 3 connections (public DB, private DB, Redis)
- ✅ **Request Tracing** - Automatic X-Request-ID middleware for distributed tracing

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         FastAPI Application                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │   API Endpoints                                             │  │
│  │   - /onboard (POST)    - /verify (GET)   - /dashboard (GET)│  │
│  │   - /handover (POST)   - /revoke (POST)  - /health (GET)   │  │
│  │   - /admin/login       - /admin/api-keys (CRUD)            │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │   Services Layer                                            │  │
│  │   - ZKP Verification   - AES-256 Encryption                │  │
│  │   - Redis Blacklist    - DPDP Consent Artefacts           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                     │                 │                │
        ┌────────────┘                 │                └──────────────┐
        │                              │                               │
┌───────▼────────┐          ┌──────────▼────────┐         ┌──────────▼────────┐
│  TimescaleDB   │          │  PostgreSQL       │         │    Redis          │
│  (Public DB)   │          │  (Private DB)     │         │  (Blacklist)      │
├────────────────┤          ├───────────────────┤         ├───────────────────┤
│ • proofs       │          │ • docs (RLS)      │         │ • Revoked proofs  │
│ • logs         │          │   (encrypted)     │         │   (7-day TTL)     │
│ • api_keys     │          └───────────────────┘         └───────────────────┘
│ • admin_users  │
│ • trusted_     │
│   domains      │
└────────────────┘
```

---

## Prerequisites

- **Docker** (v20.10+) & **Docker Compose** (v2.0+)
- **Python** 3.11+ (for local development)
- **curl** & **jq** (for testing scripts)
- **Git** (for version control)

---

## Quick Start

### 1. Clone and Setup Environment

```bash
# Clone repository
git clone <repository-url>
cd server

# Copy environment template
cp .env.example .env

# IMPORTANT: Edit .env and change these values for production:
# - SECRET_KEY (min 32 chars)
# - MASTER_ENCRYPTION_KEY (min 32 chars)
# - ADMIN_PASSWORD (strong password)
```

### 2. Start Services

**Linux/macOS:**
```bash
# Start all services (TimescaleDB, PostgreSQL, Redis)
docker-compose up -d

# Wait for databases to initialize (20-30 seconds)
sleep 30

# Run migrations
docker-compose exec timescaledb psql -U postgres -d consentvault -c "SELECT 1;"  # Test public DB
docker-compose exec postgres-private psql -U postgres -d consentvault_private -c "SELECT 1;"  # Test private DB
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Windows (PowerShell):**
```powershell
# Start all services
docker-compose up -d

# Wait for databases to initialize
Start-Sleep -Seconds 30

# Run migrations
docker-compose exec timescaledb psql -U postgres -d consentvault -c "SELECT 1;"
docker-compose exec postgres-private psql -U postgres -d consentvault_private -c "SELECT 1;"
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Verify Installation

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected output:
# {"status":"healthy","public_db":"connected","private_db":"connected","redis":"connected"}
```

### 4. Seed Initial Data (Optional)

```bash
# Run seed script to create trusted domains and sample API keys
bash scripts/seed-data.sh
```

---

## Environment Variables

All configuration is managed via `.env` file. Copy `.env.example` and customize:

| Variable | Description | Default | Production Notes |
|----------|-------------|---------|------------------|
| `PUBLIC_DATABASE_URL` | TimescaleDB connection URL | `postgresql+asyncpg://postgres:postgres@timescaledb:5432/consentvault` | Use strong passwords |
| `PRIVATE_DATABASE_URL` | Private PostgreSQL URL | `postgresql+asyncpg://postgres:postgres@postgres-private:5433/consentvault_private` | Use strong passwords |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` | Add password in production |
| `SECRET_KEY` | JWT signing key | ⚠️ **MUST CHANGE** | Min 32 chars, cryptographically random |
| `MASTER_ENCRYPTION_KEY` | AES-256 encryption key | ⚠️ **MUST CHANGE** | Min 32 chars, cryptographically random |
| `ADMIN_USERNAME` | Default admin username | `admin` | Change for security |
| `ADMIN_PASSWORD` | Default admin password | ⚠️ **MUST CHANGE** | Use strong password (min 12 chars) |

**Security Warning:** Never commit `.env` to version control. The `.env.example` file contains placeholder values only.

---

## Database Architecture

### Public Database (TimescaleDB - Port 5432)

Stores non-sensitive proof metadata, logs, and admin data. Uses TimescaleDB for time-series optimization on logs.

**Tables:**
- `proofs` - Proof metadata (user_id, doc_type, ZKP proof, expiry, revoked flag)
  - **Hypertable** partitioned by `created_at` for efficient time-series queries
- `logs` - Immutable audit log (action, user_id, proof_id, IP, user-agent, timestamp, details)
  - **Hypertable** with no UPDATE/DELETE permissions
- `api_keys` - Admin-managed API keys (key_id, name, domain, key_hash, revoked)
- `admin_users` - Admin accounts (username, password_hash, created_at)
- `trusted_domains` - Whitelist of domains allowed for handover (domain, added_at)

### Private Database (PostgreSQL - Port 5433)

Stores encrypted document data with Row-Level Security (RLS) for isolation.

**Tables:**
- `docs` - Encrypted documents (proof_id, encrypted_doc, salt, created_at)
  - **RLS Policy:** `SELECT WHERE proof_id = current_setting('app.current_proof_id')::uuid`
  - Access requires setting session variable: `SET LOCAL app.current_proof_id = '<proof_id>';`

### Redis (Port 6379)

Used for revocation blacklist with automatic expiry.

**Keys:**
- `blacklist:<proof_id>` - Revoked proof IDs (TTL: 7 days)
- **Fail-Closed Behavior:** If Redis is unavailable, all verifications return `invalid`

---

## API Endpoints

Base URL: `http://localhost:8000`

### Public Endpoints

#### 1. Health Check
```bash
GET /health

# Response:
{
  "status": "healthy",
  "public_db": "connected",
  "private_db": "connected",
  "redis": "connected"
}
```

#### 2. Onboard (Create Proof)
```bash
POST /api/v1/onboard
Content-Type: application/json

{
  "doc_data": "base64_encoded_document_or_plaintext",
  "doc_type": "aadhaar",
  "proof": {
    "pi_a": ["..."],
    "pi_b": [["..."], ["..."]],
    "pi_c": ["..."],
    "protocol": "groth16"
  },
  "pub_signals": ["signal1", "signal2"]
}

# Response (201 Created):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Flow:**
1. Verifies ZKP proof validity
2. Generates unique `user_id`
3. Encrypts document with AES-256-CBC
4. Stores proof in public DB, encrypted doc in private DB
5. Creates audit log entry
6. Returns JWT token (expires in 7 days)

#### 3. Verify Proof
```bash
GET /api/v1/verify?token=<jwt_token>

# Response (valid):
{
  "valid": true,
  "attributes": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "doc_type": "aadhaar",
    "expiry": "2026-01-30T10:30:00Z",
    "created_at": "2025-01-30T10:30:00Z"
  }
}

# Response (invalid):
{
  "valid": false,
  "reason": "Proof has been revoked"
}
```

**Validation Checks:**
- JWT signature and expiry
- Redis blacklist status
- Database proof existence
- Proof expiry date
- Revoked flag in DB

---

### Authenticated Endpoints (Require Bearer Token)

#### 4. Dashboard
```bash
GET /api/v1/dashboard
Authorization: Bearer <jwt_token>

# Response:
{
  "proofs": [
    {
      "proof_id": "123e4567-e89b-12d3-a456-426614174000",
      "doc_type": "aadhaar",
      "expiry": "2026-01-30T10:30:00Z",
      "revoked": false,
      "created_at": "2025-01-30T10:30:00Z"
    }
  ],
  "logs": [
    {
      "timestamp": "2025-01-30T10:30:05Z",
      "action": "onboard",
      "proof_id": "123e4567-e89b-12d3-a456-426614174000",
      "details": {"doc_type": "aadhaar"}
    }
  ]
}
```

#### 5. Handover (Generate Consent Artefact)
```bash
POST /api/v1/handover
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "proof_id": "123e4567-e89b-12d3-a456-426614174000",
  "consent_token": "user_generated_token",
  "requesting_domain": "healthcare.gov.in"
}

# Response (200 OK):
{
  "presigned_url": "https://vault.example.com/docs/123e4567-e89b-12d3-a456-426614174000?signature=...",
  "expires_at": "2025-01-30T11:30:00Z"
}
```

**Requirements:**
- Proof must be owned by authenticated user
- Proof must not be revoked or expired
- `requesting_domain` must exist in `trusted_domains` table

#### 6. Revoke Proof
```bash
POST /api/v1/revoke?proof_id=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt_token>

# Response (200 OK):
{
  "revoked": true,
  "proof_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Actions:**
- Adds proof to Redis blacklist (7-day TTL)
- Sets `revoked = TRUE` in database
- Creates audit log entry

---

### Admin Endpoints

#### 7. Admin Login
```bash
POST /api/v1/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-admin-password"
}

# Response (200 OK):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**JWT Claims:** `{"sub": "<admin_id>", "is_admin": true, "username": "admin"}`

#### 8. Create API Key (Admin Only)
```bash
POST /api/v1/admin/api-keys
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Production Healthcare API",
  "domain": "healthcare.gov.in"
}

# Response (201 Created):
{
  "key_id": "cvk_abc123def456",
  "name": "Production Healthcare API",
  "key_prefix": "cvk_abc123",
  "domain": "healthcare.gov.in",
  "created_at": "2025-01-30T10:30:00Z",
  "revoked": false,
  "full_key": "cvk_abc123def456ghi789jkl012mno345pqr678"  // ⚠️ ONLY SHOWN ONCE
}
```

**Important:** `full_key` is ONLY returned on creation. Store it securely.

#### 9. List API Keys (Admin Only)
```bash
GET /api/v1/admin/api-keys
Authorization: Bearer <admin_jwt_token>

# Response (200 OK):
{
  "api_keys": [
    {
      "key_id": "cvk_abc123def456",
      "name": "Production Healthcare API",
      "key_prefix": "cvk_abc123",  // Full key NOT exposed
      "domain": "healthcare.gov.in",
      "created_at": "2025-01-30T10:30:00Z",
      "revoked": false
    }
  ]
}
```

#### 10. Revoke API Key (Admin Only)
```bash
DELETE /api/v1/admin/api-keys/cvk_abc123def456
Authorization: Bearer <admin_jwt_token>

# Response (200 OK):
{
  "revoked": true,
  "key_id": "cvk_abc123def456"
}
```

---

## Development Workflow

### Running Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Check migration status
alembic current
```

**Important:** Migrations automatically detect which database they're running against and only execute relevant changes.

### Running Tests

```bash
# Run QA test suite (tests all endpoints)
bash scripts/qa-tests.sh

# Expected output: All tests should pass with green checkmarks
```

### Adding Trusted Domains

**Via SQL:**
```sql
-- Connect to public database
psql -U postgres -d consentvault

-- Add domain
INSERT INTO trusted_domains (domain) VALUES ('healthcare.gov.in');
```

**Via Seed Script:**
```bash
bash scripts/seed-data.sh
```

### Viewing Logs

```bash
# TimescaleDB logs (last 100 entries)
docker-compose exec timescaledb psql -U postgres -d consentvault -c "SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100;"

# Application logs
docker-compose logs -f app  # If running via docker-compose
```

---

## Authentication

### JWT Tokens

**User Tokens** (from `/onboard`):
- Expires: 7 days
- Claims: `{"sub": "<user_id>", "proof_id": "<proof_id>", "doc_type": "<type>"}`
- Used for: `/dashboard`, `/handover`, `/revoke`

**Admin Tokens** (from `/admin/login`):
- Expires: 24 hours
- Claims: `{"sub": "<admin_id>", "is_admin": true, "username": "<username>"}`
- Used for: `/admin/api-keys/*`

### API Keys

- Format: `cvk_<random_40_chars>`
- Stored: SHA-256 hash in `api_keys` table
- Usage: Future integration with external systems (not currently implemented in endpoints)

---

## Security Features

### Encryption
- **Algorithm:** AES-256-CBC
- **Key Derivation:** PBKDF2 with user-specific salt
- **Storage:** Encrypted blobs in `docs.encrypted_doc`, salts in `docs.salt`

### Password Hashing
- **Algorithm:** bcrypt (cost factor 12)
- **Storage:** Hashed passwords in `admin_users.password_hash`

### Row-Level Security (RLS)
- **Private DB:** `docs` table has RLS policy requiring session variable
- **Session Variable:** `app.current_proof_id` must match `proof_id`
- **Enforcement:** PostgreSQL prevents unauthorized cross-document access

### Fail-Closed Redis
- **Behavior:** If Redis is unavailable, `/verify` returns `{"valid": false}`
- **Rationale:** Prefer denying access over allowing revoked proofs

### Request Tracing
- **Middleware:** Automatic `X-Request-ID` header injection
- **Format:** UUID v4
- **Usage:** Correlate logs across services

---

## Troubleshooting

### Issue: `alembic upgrade head` fails with "database does not exist"

**Solution:**
```bash
# Create databases manually
docker-compose exec timescaledb psql -U postgres -c "CREATE DATABASE consentvault;"
docker-compose exec postgres-private psql -U postgres -c "CREATE DATABASE consentvault_private;"

# Enable TimescaleDB extension
docker-compose exec timescaledb psql -U postgres -d consentvault -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Retry migration
alembic upgrade head
```

### Issue: Redis connection refused

**Solution:**
```bash
# Check Redis status
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Verify connectivity
redis-cli -h localhost -p 6379 ping  # Should return PONG
```

### Issue: `/admin/login` returns 401 with correct credentials

**Possible Causes:**
1. Admin user not seeded in migration
2. Password hash mismatch

**Solution:**
```bash
# Check if admin exists
docker-compose exec timescaledb psql -U postgres -d consentvault -c "SELECT * FROM admin_users;"

# If empty, re-run migration
alembic downgrade base
alembic upgrade head

# Verify ADMIN_USERNAME and ADMIN_PASSWORD in .env match migration values
```

### Issue: `/verify` always returns `{"valid": false}`

**Debugging Steps:**
```bash
# 1. Check Redis connectivity
curl http://localhost:8000/health

# 2. Verify token is not expired
# Decode JWT at https://jwt.io

# 3. Check blacklist status
redis-cli -h localhost -p 6379 GET "blacklist:<proof_id>"

# 4. Query database
docker-compose exec timescaledb psql -U postgres -d consentvault -c "SELECT * FROM proofs WHERE id = '<proof_id>';"
```

### Issue: `pg_cron` extension errors

**Background:** `pg_cron` requires additional PostgreSQL configuration and is commented out in migrations.

**If you need pg_cron:**
```bash
# 1. Install pg_cron in TimescaleDB container
docker-compose exec timescaledb apt-get update && apt-get install -y postgresql-15-cron

# 2. Add to postgresql.conf
shared_preload_libraries = 'timescaledb,pg_cron'
cron.database_name = 'consentvault'

# 3. Restart container
docker-compose restart timescaledb

# 4. Uncomment pg_cron lines in alembic migrations
```

---

## Production Deployment Checklist

- [ ] Change `SECRET_KEY` to cryptographically random 32+ char string
- [ ] Change `MASTER_ENCRYPTION_KEY` to cryptographically random 32+ char string
- [ ] Change `ADMIN_PASSWORD` to strong password (min 12 chars)
- [ ] Use strong database passwords (not `postgres`)
- [ ] Enable Redis authentication (`requirepass` in redis.conf)
- [ ] Configure HTTPS with valid TLS certificate
- [ ] Set up database backups (daily for public DB, hourly for private DB)
- [ ] Enable PostgreSQL connection pooling (PgBouncer)
- [ ] Configure log aggregation (ELK stack or equivalent)
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Review and configure CORS origins in `app/main.py`
- [ ] Enable rate limiting (nginx or FastAPI middleware)
- [ ] Set up database replication for high availability
- [ ] Document disaster recovery procedures
- [ ] Conduct security audit (penetration testing)

---

## Technology Stack

- **Framework:** FastAPI 0.104.1
- **Database (Public):** TimescaleDB 2.11 (PostgreSQL 15 + time-series extensions)
- **Database (Private):** PostgreSQL 15
- **Cache/Blacklist:** Redis 7
- **ORM:** SQLAlchemy 2.0+ (async)
- **Migrations:** Alembic
- **Authentication:** JWT (python-jose), bcrypt
- **Encryption:** Cryptography library (AES-256-CBC, PBKDF2)
- **Validation:** Pydantic v2

---

## Project Structure

```
server/
├── alembic/                    # Database migrations
│   ├── versions/              # Migration scripts
│   └── env.py                 # Migration environment config
├── app/
│   ├── api/
│   │   ├── deps.py            # Dependency injection (auth, metadata)
│   │   └── v1/
│   │       ├── router.py      # API router aggregation
│   │       └── endpoints/
│   │           ├── proof.py   # Proof lifecycle endpoints
│   │           └── admin.py   # Admin authentication & API keys
│   ├── core/
│   │   ├── config.py          # Pydantic settings (env vars)
│   │   ├── database.py        # Dual async engines (public/private)
│   │   └── security.py        # JWT, AES, bcrypt utilities
│   ├── crud/                  # Database operations (async)
│   │   ├── proof.py
│   │   ├── log.py
│   │   ├── doc.py
│   │   ├── admin.py
│   │   ├── api_key.py
│   │   └── domain.py
│   ├── models/                # SQLAlchemy models
│   │   ├── proof.py
│   │   ├── log.py
│   │   ├── doc.py
│   │   ├── admin.py
│   │   ├── api_key.py
│   │   └── domain.py
│   ├── schemas/               # Pydantic schemas (validation)
│   │   ├── proof.py
│   │   ├── consent.py
│   │   ├── log.py
│   │   ├── auth.py
│   │   └── admin.py
│   ├── services/              # Business logic
│   │   ├── vault.py           # ZKP verification, encryption
│   │   ├── redis.py           # Blacklist management
│   │   └── consent.py         # DPDP consent artefacts
│   └── main.py                # FastAPI application entry point
├── scripts/
│   ├── qa-tests.sh            # Endpoint testing script
│   └── seed-data.sh           # Initial data seeding
├── docker-compose.yml         # Service orchestration
├── .env.example               # Environment template
├── .env                       # Environment variables (git-ignored)
├── requirements.txt           # Python dependencies
├── alembic.ini                # Alembic configuration
└── README.md                  # This file
```

---

## License

[Add your license here]

---

## Contributors

[Add contributor information]

---

## Support

For issues or questions:
- **Email:** [support email]
- **GitHub Issues:** [repository issues URL]
- **Documentation:** This README + inline code comments

---

## Changelog

### v1.0.0 (2025-01-30)
- Initial release with all core features
- Dual-database architecture with TimescaleDB and PostgreSQL
- ZKP verification, encryption, revocation, and audit logging
- Admin API key management
- Production-ready health checks and error handling
