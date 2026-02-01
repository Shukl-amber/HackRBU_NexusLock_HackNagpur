# ConsentVault DPI Backend

## TL;DR

> **Quick Summary**: Build a production-ready FastAPI backend for DPDP-compliant consent management with dual PostgreSQL databases (TimescaleDB + RLS-protected), Redis blacklisting, ZKP verification stub, and AES-256 encryption.
> 
> **Deliverables**:
> - Complete FastAPI application in `./server/`
> - Docker Compose with TimescaleDB, PostgreSQL, and Redis
> - Alembic migrations for both databases
> - 6 API endpoints + health check
> - Admin API key management
> - Comprehensive documentation
> 
> **Estimated Effort**: Large (3-4 days)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 7

---

## Context

### Original Request
Build a production-ready FastAPI backend for "ConsentVault DPI" - a DPDP-compliant consent management system with dual PostgreSQL databases, ZKP verification, AES encryption, Redis blacklisting, and comprehensive audit logging.

### Interview Summary
**Key Discussions**:
- **Authentication**: JWT for frontend users + API keys for service-to-service
- **ZKP**: Stub implementation only (validates JSON structure, returns mock results)
- **Dashboard**: User-scoped views + admin elevated access
- **Testing**: Manual QA via OpenAPI docs and curl (no pytest)
- **Real-time**: Polling instead of WebSocket
- **presigned_url**: JWT-signed URLs (no S3/MinIO)
- **Docker**: Two separate containers - TimescaleDB (public) + PostgreSQL (private)
- **Auth flow**: /onboard returns JWT, used for all future requests
- **Encryption**: Master key + per-user salt for AES-256-CBC
- **API keys**: Full admin CRUD endpoints
- **Duplicates**: Allow multiple proofs for same doc
- **Redis failure**: Fail closed (deny access)

**Research Findings**:
- Use `create_async_engine` with asyncpg, separate `async_sessionmaker` per DB
- `expire_on_commit=False` is CRITICAL for async sessions
- TimescaleDB hypertables via raw SQL in Alembic (not ORM)
- RLS via PostgreSQL session variables + middleware
- PBKDF2HMAC-SHA256 with 1.2M iterations for key derivation
- DPDP consent artefacts need: consent_id, purpose, expiry, digital signature

### Metis Review
**Identified Gaps** (addressed):
- User auth flow clarified → Onboard returns JWT
- AES key derivation clarified → Master key + user salt
- API key management clarified → Full admin CRUD
- Duplicate handling clarified → Allow duplicates
- Redis failure behavior clarified → Fail closed
- Edge cases documented (expired=410, concurrent revoke=idempotent, etc.)

---

## Work Objectives

### Core Objective
Create a complete, working FastAPI backend that implements DPDP-compliant consent management with dual-database architecture, encryption, and comprehensive audit logging.

### Concrete Deliverables
- `server/app/` - Complete FastAPI application
- `server/docker-compose.yml` - TimescaleDB + PostgreSQL + Redis
- `server/alembic/` - Migrations for both databases
- `server/requirements.txt` - All Python dependencies
- `server/.env.example` - Environment variable template
- `server/README.md` - Setup and API documentation

### Definition of Done
- [x] `docker-compose up -d` starts all services without errors
- [x] `alembic upgrade head` runs migrations on both databases
- [x] `curl http://localhost:8000/health` returns `{"status": "healthy", "databases": {"public": "connected", "private": "connected"}}`
- [x] All 6 API endpoints respond correctly per specification
- [x] Admin can create/list/revoke API keys
- [x] Revoked proofs return `{"valid": false}` on verify

### Must Have
- Dual PostgreSQL engines (public TimescaleDB, private with RLS)
- JWT authentication with user_id claim
- API key authentication for service-to-service
- AES-256-CBC encryption with master key + user salt
- Redis blacklist with 7-day TTL
- DPDP consent artefacts with HMAC signatures
- Comprehensive audit logging
- pg_cron for expired proof cleanup
- Trusted domains whitelist
- CORS for localhost:3000

### Must NOT Have (Guardrails)
- No WebSocket implementation (use polling)
- No S3/MinIO integration (use JWT-signed URLs)
- No pytest/test infrastructure (manual QA only)
- No real ZKP verification (stub only)
- No frontend code changes
- No encryption keys in database or logs
- No synchronous database calls
- No business logic in endpoint functions (use services/)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **User wants tests**: NO - Manual QA only
- **Framework**: None

### Automated Verification (Agent-Executable)

Each TODO includes EXECUTABLE verification procedures:

**By Deliverable Type:**

| Type | Verification Tool | Automated Procedure |
|------|------------------|---------------------|
| Docker/Infra | Bash commands | `docker-compose ps`, health checks |
| Database | Bash psql/curl | Migration status, table existence |
| API Endpoints | Bash curl | Request/response validation |
| Config | Bash commands | File existence, env parsing |

**Evidence Requirements:**
- Command output captured and compared against expected patterns
- Exit codes checked (0 = success)
- JSON response fields validated with jq assertions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Docker Compose + Infrastructure
└── Task 4: Pydantic Schemas (no DB dependency)

Wave 2 (After Wave 1):
├── Task 2: Core Module (config, security, database)
├── Task 3: Alembic Migrations
└── Task 6: Services Layer

Wave 3 (After Wave 2):
├── Task 5: SQLAlchemy Models + CRUD
└── Task 7: API Endpoints

Wave 4 (After Wave 3):
├── Task 8: Admin API Key Endpoints
└── Task 9: Integration + Health Check

Wave 5 (Final):
└── Task 10: Documentation + QA Scripts

Critical Path: Task 1 → Task 2 → Task 3 → Task 5 → Task 7 → Task 9
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | 4 |
| 2 | 1 | 3, 5, 6 | 4 |
| 3 | 2 | 5 | 6 |
| 4 | None | 5, 7 | 1, 2, 3 |
| 5 | 3, 4 | 7, 8 | 6 |
| 6 | 2 | 7 | 3, 4, 5 |
| 7 | 5, 6 | 9 | 8 |
| 8 | 5 | 9 | 7 |
| 9 | 7, 8 | 10 | None |
| 10 | 9 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 1, 4 | `delegate_task(category="quick", ...)` parallel |
| 2 | 2, 3, 6 | `delegate_task(category="unspecified-high", ...)` parallel after Wave 1 |
| 3 | 5, 7 | Sequential - critical path |
| 4 | 8, 9 | `delegate_task(category="quick", ...)` parallel |
| 5 | 10 | `delegate_task(category="writing", ...)` |

---

## TODOs

- [x] 1. Docker Compose + Infrastructure Setup

  **What to do**:
  - Create `server/docker-compose.yml` with:
    - `timescaledb` service (TimescaleDB 2.x on PostgreSQL 15) on port 5432
    - `postgres-private` service (PostgreSQL 15) on port 5433
    - `redis` service (Redis 7.x) on port 6379
    - Named volumes for data persistence
    - Health checks for all services
    - Network configuration for inter-container communication
  - Create `server/.env.example` with all required environment variables:
    - PUBLIC_DATABASE_URL, PRIVATE_DATABASE_URL, REDIS_URL
    - SECRET_KEY, MASTER_ENCRYPTION_KEY
    - ADMIN_USERNAME, ADMIN_PASSWORD (for seeding admin user in migrations)
  - Create `server/requirements.txt` with pinned versions

  **Must NOT do**:
  - Do not use `latest` tags - pin specific versions
  - Do not expose databases to host network (use Docker network)
  - Do not include production secrets in .env.example

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Docker/config file creation, well-defined structure
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit after completion
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved
    - `playwright`: No browser testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - TimescaleDB Docker docs: https://docs.timescale.com/self-hosted/latest/install/installation-docker/
  - Redis Docker Hub: https://hub.docker.com/_/redis

  **Documentation References**:
  - User requirements specify: TimescaleDB for public DB, PostgreSQL for private DB
  - Windows compatibility: Use standard Docker Compose syntax

  **WHY Each Reference Matters**:
  - TimescaleDB Docker docs show correct image tags and environment variables
  - Redis Docker Hub shows health check patterns

  **Acceptance Criteria**:

  ```bash
  # Verify docker-compose.yml exists and is valid
  cd server && docker-compose config
  # Assert: Exit code 0, no errors

  # Verify .env.example exists with required vars
  grep -E "^(PUBLIC_DATABASE_URL|PRIVATE_DATABASE_URL|REDIS_URL|SECRET_KEY|MASTER_ENCRYPTION_KEY|ADMIN_USERNAME|ADMIN_PASSWORD)=" server/.env.example
  # Assert: All 7 variables present

  # Verify requirements.txt exists with key packages
  grep -E "^(fastapi|sqlalchemy|asyncpg|redis|pydantic|python-jose|alembic|cryptography)" server/requirements.txt
  # Assert: All 8 packages present

  # Start containers
  cd server && cp .env.example .env && docker-compose up -d
  # Wait for health
  sleep 15
  docker-compose ps --format json | jq '.[].State'
  # Assert: All states are "running"

  # Verify TimescaleDB is accessible
  docker-compose exec -T timescaledb psql -U postgres -c "SELECT 1"
  # Assert: Returns "1"

  # Verify private PostgreSQL is accessible
  docker-compose exec -T postgres-private psql -U postgres -c "SELECT 1"
  # Assert: Returns "1"

  # Verify Redis is accessible
  docker-compose exec -T redis redis-cli PING
  # Assert: Returns "PONG"
  ```

  **Commit**: YES
  - Message: `feat(infra): add docker-compose with TimescaleDB, PostgreSQL, and Redis`
  - Files: `server/docker-compose.yml`, `server/.env.example`, `server/requirements.txt`
  - Pre-commit: `cd server && docker-compose config`

---

- [x] 2. Core Module (config, security, database)

  **What to do**:
  - Create `server/app/__init__.py` (empty)
  - Create `server/app/core/__init__.py` (empty)
  - Create `server/app/core/config.py`:
    - Use `pydantic-settings` for configuration
    - Define `Settings` class with all env vars
    - Include: database URLs, Redis URL, secret key, master encryption key, CORS origins, JWT settings
  - Create `server/app/core/database.py`:
    - Create `public_engine` (TimescaleDB) and `private_engine` (PostgreSQL)
    - Create `PublicSession` and `PrivateSession` async session makers
    - Create `get_public_db()` and `get_private_db()` FastAPI dependencies
    - Use `expire_on_commit=False`, `pool_pre_ping=True`
  - Create `server/app/core/security.py`:
    - JWT creation and verification functions (python-jose)
    - AES-256-CBC encryption/decryption with PBKDF2HMAC key derivation
    - API key validation function
    - Password hashing (for future admin users)

  **Must NOT do**:
  - Do not log encryption keys or secrets
  - Do not use synchronous database connections
  - Do not hardcode any secrets

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core infrastructure with security implications, requires careful implementation
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Wave 1)
  - **Parallel Group**: Wave 2 (with Tasks 3, 6)
  - **Blocks**: Tasks 3, 5, 6
  - **Blocked By**: Task 1 (needs .env.example for reference)

  **References**:

  **Pattern References**:
  - Librarian research: SQLAlchemy 2.0+ async patterns with `create_async_engine`
  - Librarian research: `expire_on_commit=False` is CRITICAL for async sessions
  - Librarian research: PBKDF2HMAC with 1.2M iterations for key derivation

  **API/Type References**:
  - pydantic-settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
  - python-jose: https://python-jose.readthedocs.io/en/latest/

  **Documentation References**:
  - Draft `.sisyphus/drafts/consentvault-backend.md`: Master key + user salt pattern

  **WHY Each Reference Matters**:
  - pydantic-settings handles env var parsing with validation
  - python-jose JWT patterns for encode/decode with claims
  - PBKDF2 iterations count affects security vs performance

  **Acceptance Criteria**:

  ```bash
  # Verify all core files exist
  ls server/app/core/{__init__,config,database,security}.py
  # Assert: All 4 files exist

  # Verify Settings class loads from environment
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.core.config import settings
  print(settings.SECRET_KEY)
  "
  # Assert: Prints "test-secret-key-32-chars-long!!"

  # Verify database engines are created
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.core.database import public_engine, private_engine
  print(type(public_engine).__name__)
  "
  # Assert: Prints "AsyncEngine"

  # Verify JWT functions exist
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.core.security import create_access_token, verify_token
  token = create_access_token({'sub': 'user123'})
  payload = verify_token(token)
  print(payload['sub'])
  "
  # Assert: Prints "user123"

  # Verify encryption functions exist
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.core.security import encrypt_document, decrypt_document
  import uuid
  user_id = str(uuid.uuid4())
  encrypted, salt = encrypt_document(b'test data', user_id)
  decrypted = decrypt_document(encrypted, salt, user_id)
  print(decrypted.decode())
  "
  # Assert: Prints "test data"
  ```

  **Commit**: YES
  - Message: `feat(core): add config, database engines, and security utilities`
  - Files: `server/app/__init__.py`, `server/app/core/*.py`
  - Pre-commit: Python syntax check

---

- [x] 3. Alembic Migrations Setup

  **What to do**:
  - Initialize Alembic: `alembic init alembic`
  - Configure `server/alembic.ini` for async and dual database support
  - Create `server/alembic/env.py` that handles both databases
  - Create initial migration for public database:
    - `proofs` table with TimescaleDB hypertable
    - `logs` table with immutable trigger
    - `trusted_domains` table
    - `api_keys` table
    - `admin_users` table (id, username, hashed_password, is_active, created_at)
    - Indexes and constraints
    - Seed default admin user (username from env: ADMIN_USERNAME, password from env: ADMIN_PASSWORD)
  - Create initial migration for private database:
    - `docs` table with RLS policies
    - Enable RLS on docs table
  - Create pg_cron job for expired proof cleanup (in public DB migration)

  **Must NOT do**:
  - Do not use ORM for hypertable creation (must be raw SQL)
  - Do not skip RLS policy creation
  - Do not create tests directory

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex multi-database migration with TimescaleDB and RLS
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 2)
  - **Parallel Group**: Wave 2 (with Tasks 2, 6)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2 (needs database.py)

  **References**:

  **Pattern References**:
  - Librarian research: `create_hypertable()` via raw SQL in Alembic
  - Librarian research: RLS via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - TimescaleDB docs: https://docs.timescale.com/api/latest/hypertable/create_hypertable/

  **Documentation References**:
  - User spec: `public.proofs` with id, user_id(UUID), doc_type, proof(BYTEA), pub_signals(JSONB), expiry(TIMESTAMPTZ), revoked
  - User spec: `public.logs` immutable audit trail
  - User spec: `private.docs` with proof_id → encrypted_doc(BYTEA)
  - User spec: `public.trusted_domains` whitelist

  **WHY Each Reference Matters**:
  - TimescaleDB hypertable must be created AFTER table creation
  - RLS policies must use raw SQL, not ORM
  - Immutable log trigger prevents UPDATE/DELETE

  **Acceptance Criteria**:

  ```bash
  # Verify alembic structure exists
  ls server/alembic/{env.py,versions/}
  # Assert: Both exist

  # Verify alembic.ini exists
  ls server/alembic.ini
  # Assert: File exists

  # Start Docker containers
  cd server && docker-compose up -d && sleep 15

  # Run migrations
  cd server && alembic upgrade head
  # Assert: Exit code 0

  # Verify public tables exist
  docker-compose exec -T timescaledb psql -U postgres -d consentvault -c "\dt public.*"
  # Assert: Shows proofs, logs, trusted_domains, api_keys, admin_users tables

  # Verify admin user is seeded
  docker-compose exec -T timescaledb psql -U postgres -d consentvault -c "SELECT username FROM admin_users LIMIT 1"
  # Assert: Returns admin username

  # Verify proofs is a hypertable
  docker-compose exec -T timescaledb psql -U postgres -d consentvault -c "SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'proofs'"
  # Assert: Returns "proofs"

  # Verify private tables exist with RLS
  docker-compose exec -T postgres-private psql -U postgres -d consentvault_private -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'docs'"
  # Assert: Shows docs with rowsecurity = true

  # Verify pg_cron job exists
  docker-compose exec -T timescaledb psql -U postgres -d consentvault -c "SELECT jobname FROM cron.job WHERE jobname LIKE '%expired%'"
  # Assert: Returns cleanup job name
  ```

  **Commit**: YES
  - Message: `feat(db): add Alembic migrations with TimescaleDB hypertables and RLS`
  - Files: `server/alembic.ini`, `server/alembic/**`
  - Pre-commit: `cd server && alembic check`

---

- [x] 4. Pydantic Schemas

  **What to do**:
  - Create `server/app/schemas/__init__.py`
  - Create `server/app/schemas/proof.py`:
    - `ProofCreate` - input for /onboard (doc_data, proof, pub_signals)
    - `ProofResponse` - output with proof_id, doc_type, expiry, revoked
    - `ProofVerifyResponse` - {valid: bool, attributes: JSON, reason?: string}
    - `ProofListResponse` - for dashboard
  - Create `server/app/schemas/consent.py`:
    - `ConsentArtefact` - DPDP compliant with signature
    - `HandoverRequest` - proof_id, consent_token
    - `HandoverResponse` - presigned_url, expires_at
  - Create `server/app/schemas/log.py`:
    - `LogEntry` - timestamp, action, user_id, ip, user_agent, details
    - `LogListResponse` - for dashboard
  - Create `server/app/schemas/auth.py`:
    - `TokenResponse` - access_token, token_type
    - `APIKeyCreate`, `APIKeyResponse`, `APIKeyListResponse`
  - Create `server/app/schemas/admin.py`:
    - `AdminLogin` - username, password
    - `AdminTokenResponse` - access_token, token_type (JWT includes is_admin claim)
  - Create `server/app/schemas/common.py`:
    - `HealthResponse`, `ErrorResponse`

  **Must NOT do**:
  - Do not import database models (schemas are independent)
  - Do not add business logic to schemas

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward Pydantic model definitions
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 5, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - Pydantic v2 docs: https://docs.pydantic.dev/latest/

  **Documentation References**:
  - User spec: API endpoints define expected request/response shapes
  - Draft: DPDP consent artefact needs consent_id, purpose, expiry, HMAC signature
  - Librarian research: FHIR Consent resource structure for reference

  **WHY Each Reference Matters**:
  - Pydantic v2 has different syntax from v1 (use `model_validator` not `validator`)
  - DPDP compliance requires specific fields in consent artefact

  **Acceptance Criteria**:

  ```bash
  # Verify schema files exist
  ls server/app/schemas/{__init__,proof,consent,log,auth,admin,common}.py
  # Assert: All 7 files exist

  # Verify schemas can be imported
  cd server && python -c "
  from app.schemas.proof import ProofCreate, ProofResponse, ProofVerifyResponse
  from app.schemas.consent import ConsentArtefact, HandoverRequest, HandoverResponse
  from app.schemas.log import LogEntry, LogListResponse
  from app.schemas.auth import TokenResponse, APIKeyCreate, APIKeyResponse
  from app.schemas.admin import AdminLogin, AdminTokenResponse
  from app.schemas.common import HealthResponse, ErrorResponse
  print('All schemas imported successfully')
  "
  # Assert: Prints success message

  # Verify ProofCreate has required fields
  cd server && python -c "
  from app.schemas.proof import ProofCreate
  import json
  print(json.dumps(ProofCreate.model_json_schema()['required']))
  "
  # Assert: Contains 'doc_data', 'proof', 'pub_signals'

  # Verify ConsentArtefact has DPDP fields
  cd server && python -c "
  from app.schemas.consent import ConsentArtefact
  import json
  schema = ConsentArtefact.model_json_schema()
  props = list(schema['properties'].keys())
  print(props)
  "
  # Assert: Contains 'consent_id', 'purpose', 'expiry_date', 'signature'
  ```

  **Commit**: YES
  - Message: `feat(schemas): add Pydantic schemas for proofs, consent, logs, and auth`
  - Files: `server/app/schemas/*.py`
  - Pre-commit: Python import check

---

- [x] 5. SQLAlchemy Models + CRUD

  **What to do**:
  - Create `server/app/models/__init__.py` with Base classes
  - Create `server/app/models/proof.py`:
    - `Proof` model for public.proofs table
    - Proper column types: UUID, BYTEA, JSONB, TIMESTAMPTZ
  - Create `server/app/models/log.py`:
    - `Log` model for public.logs table
    - Include all audit fields
  - Create `server/app/models/domain.py`:
    - `TrustedDomain` model for public.trusted_domains
  - Create `server/app/models/api_key.py`:
    - `APIKey` model for public.api_keys
  - Create `server/app/models/admin.py`:
    - `AdminUser` model for public.admin_users (id, username, hashed_password, is_active, created_at)
  - Create `server/app/models/doc.py`:
    - `Doc` model for private.docs table
  - Create `server/app/crud/__init__.py`
  - Create `server/app/crud/proof.py`:
    - `create_proof()`, `get_proof()`, `get_proofs_by_user()`, `revoke_proof()`
  - Create `server/app/crud/log.py`:
    - `create_log()`, `get_logs_by_user()`, `get_logs_by_proof()`
  - Create `server/app/crud/doc.py`:
    - `create_doc()`, `get_doc_by_proof()`
  - Create `server/app/crud/domain.py`:
    - `is_domain_trusted()`
  - Create `server/app/crud/api_key.py`:
    - `create_api_key()`, `get_api_key()`, `list_api_keys()`, `revoke_api_key()`
  - Create `server/app/crud/admin.py`:
    - `get_admin_by_username()`, `verify_admin_password()`

  **Must NOT do**:
  - Do not put business logic in CRUD functions (only DB operations)
  - Do not use synchronous session
  - Do not skip type hints

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core data layer with async patterns
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: NO (on critical path)
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: Tasks 3, 4 (needs migrations and schemas)

  **References**:

  **Pattern References**:
  - Librarian research: SQLAlchemy 2.0+ async patterns
  - SQLAlchemy docs: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

  **API/Type References**:
  - Task 3: Table definitions from migrations
  - Task 4: Schema types for request/response mapping

  **Documentation References**:
  - User spec: Table structures for proofs, logs, docs, trusted_domains

  **WHY Each Reference Matters**:
  - SQLAlchemy 2.0 async uses different query patterns than 1.x
  - CRUD must match migration table structures exactly

  **Acceptance Criteria**:

  ```bash
  # Verify model files exist
  ls server/app/models/{__init__,proof,log,domain,api_key,admin,doc}.py
  # Assert: All 7 files exist

  # Verify CRUD files exist
  ls server/app/crud/{__init__,proof,log,doc,domain,api_key,admin}.py
  # Assert: All 7 files exist

  # Verify models can be imported
  cd server && python -c "
  from app.models.proof import Proof
  from app.models.log import Log
  from app.models.domain import TrustedDomain
  from app.models.api_key import APIKey
  from app.models.admin import AdminUser
  from app.models.doc import Doc
  print('All models imported successfully')
  "
  # Assert: Prints success message

  # Verify CRUD functions exist
  cd server && python -c "
  from app.crud.proof import create_proof, get_proof, get_proofs_by_user, revoke_proof
  from app.crud.log import create_log, get_logs_by_user
  from app.crud.doc import create_doc, get_doc_by_proof
  from app.crud.domain import is_domain_trusted
  from app.crud.api_key import create_api_key, get_api_key, list_api_keys, revoke_api_key
  from app.crud.admin import get_admin_by_username, verify_admin_password
  print('All CRUD functions imported successfully')
  "
  # Assert: Prints success message
  ```

  **Commit**: YES
  - Message: `feat(models): add SQLAlchemy models and CRUD operations`
  - Files: `server/app/models/*.py`, `server/app/crud/*.py`
  - Pre-commit: Python import check

---

- [x] 6. Services Layer

  **What to do**:
  - Create `server/app/services/__init__.py`
  - Create `server/app/services/vault.py`:
    - `verify_zkp_proof()` - stub that validates JSON structure, returns mock result
    - `encrypt_document()` - wrapper around security.encrypt_document
    - `decrypt_document()` - wrapper around security.decrypt_document
  - Create `server/app/services/redis.py`:
    - `RedisBlacklist` class with:
      - `add_to_blacklist(proof_id, ttl_days=7)`
      - `is_blacklisted(proof_id)` - returns True if blacklisted OR Redis unavailable (fail closed)
      - `remove_from_blacklist(proof_id)`
    - Use async redis client (aioredis or redis-py async)
  - Create `server/app/services/consent.py`:
    - `generate_consent_artefact()` - creates DPDP compliant artefact with HMAC signature
    - `verify_consent_artefact()` - validates signature
    - `generate_presigned_url()` - creates JWT-signed URL with 5min expiry

  **Must NOT do**:
  - Do not implement real ZKP verification (stub only)
  - Do not use S3/MinIO for presigned URLs
  - Do not fail open on Redis unavailability

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Business logic with security implications
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 2)
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2 (needs security.py)

  **References**:

  **Pattern References**:
  - Librarian research: Redis SETEX pattern for TTL-based blacklisting
  - Librarian research: HMAC-SHA256 for consent artefact signing
  - Librarian research: Groth16 proof structure (pi_a, pi_b, pi_c, public signals)

  **Documentation References**:
  - Draft: DPDP consent artefact fields
  - Draft: Redis fail closed behavior
  - Draft: presigned URL is JWT-signed (not S3)

  **WHY Each Reference Matters**:
  - ZKP stub must validate correct JSON structure even if not verifying cryptographically
  - Redis fail closed is critical security requirement
  - DPDP artefact must have all required fields for compliance

  **Acceptance Criteria**:

  ```bash
  # Verify service files exist
  ls server/app/services/{__init__,vault,redis,consent}.py
  # Assert: All 4 files exist

  # Verify ZKP stub works
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.services.vault import verify_zkp_proof
  result = verify_zkp_proof({'pi_a': [], 'pi_b': [[]], 'pi_c': []}, [])
  print(result)
  "
  # Assert: Returns dict with 'valid' key

  # Verify consent artefact generation
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.services.consent import generate_consent_artefact
  artefact = generate_consent_artefact('user123', 'proof456', ['identity_verification'])
  print('consent_id' in artefact and 'signature' in artefact)
  "
  # Assert: Prints "True"

  # Verify presigned URL generation
  cd server && python -c "
  import os
  os.environ['PUBLIC_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['PRIVATE_DATABASE_URL'] = 'postgresql+asyncpg://test:test@localhost/test'
  os.environ['REDIS_URL'] = 'redis://localhost:6379'
  os.environ['SECRET_KEY'] = 'test-secret-key-32-chars-long!!'
  os.environ['MASTER_ENCRYPTION_KEY'] = 'test-master-key-32-chars-long!!'
  from app.services.consent import generate_presigned_url
  url = generate_presigned_url('proof123')
  print(url.startswith('http'))
  "
  # Assert: Prints "True"
  ```

  **Commit**: YES
  - Message: `feat(services): add vault, redis blacklist, and consent services`
  - Files: `server/app/services/*.py`
  - Pre-commit: Python import check

---

- [x] 7. API Endpoints (Main)

  **What to do**:
  - Create `server/app/api/__init__.py`
  - Create `server/app/api/deps.py`:
    - `get_current_user()` - JWT dependency, extracts user_id
    - `get_current_admin()` - JWT dependency with admin role check
    - `verify_api_key()` - API key header dependency
    - `get_request_metadata()` - extracts IP, user-agent for logging
  - Create `server/app/api/v1/__init__.py`
  - Create `server/app/api/v1/endpoints/__init__.py`
  - Create `server/app/api/v1/endpoints/proof.py`:
    - `POST /onboard` - create proof, encrypt doc, return JWT + proof_id
    - `GET /verify` - verify token, check blacklist, return validity
    - `POST /handover` - validate consent, check domain, return presigned URL
    - `POST /revoke` - add to blacklist, update DB, log action
    - `GET /dashboard` - return user's proofs and logs (or all if admin)
  - Create `server/app/api/v1/router.py` - combine all endpoint routers
  - Create `server/app/main.py`:
    - FastAPI app with lifespan for startup/shutdown
    - CORS middleware for localhost:3000
    - Include v1 router at /api/v1
    - Add /health endpoint

  **Must NOT do**:
  - Do not put business logic in endpoint functions (call services)
  - Do not return raw database errors
  - Do not skip audit logging for any operation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core API with authentication and business logic orchestration
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved
    - `playwright`: Will verify manually with curl

  **Parallelization**:
  - **Can Run In Parallel**: NO (on critical path)
  - **Parallel Group**: Wave 3 (with Task 8 after dependencies)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 5, 6 (needs models, CRUD, services)

  **References**:

  **Pattern References**:
  - FastAPI docs: https://fastapi.tiangolo.com/
  - Librarian research: FastAPI dependency injection patterns

  **API/Type References**:
  - Task 4: Pydantic schemas for request/response
  - Task 5: CRUD functions for database operations
  - Task 6: Services for business logic

  **Documentation References**:
  - User spec: Endpoint definitions
  - Draft: All decisions about behavior (fail closed, allow duplicates, etc.)

  **WHY Each Reference Matters**:
  - FastAPI lifespan for proper async resource management
  - Dependencies chain auth → services → CRUD → database

  **Acceptance Criteria**:

  ```bash
  # Verify API files exist
  ls server/app/api/{__init__,deps}.py
  ls server/app/api/v1/{__init__,router}.py
  ls server/app/api/v1/endpoints/{__init__,proof}.py
  ls server/app/main.py
  # Assert: All files exist

  # Start the server (with Docker running)
  cd server && docker-compose up -d && sleep 10
  cd server && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
  sleep 5

  # Test health endpoint
  curl -s http://localhost:8000/health | jq '.status'
  # Assert: Returns "healthy"

  # Test onboard endpoint
  curl -s -X POST http://localhost:8000/api/v1/onboard \
    -H "Content-Type: application/json" \
    -d '{"doc_data": "test document", "doc_type": "aadhaar", "proof": {"pi_a": [], "pi_b": [[]], "pi_c": []}, "pub_signals": []}' \
    | jq '.proof_id'
  # Assert: Returns UUID string

  # Test verify endpoint (with token from onboard)
  TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/onboard \
    -H "Content-Type: application/json" \
    -d '{"doc_data": "test", "doc_type": "pan", "proof": {"pi_a": [], "pi_b": [[]], "pi_c": []}, "pub_signals": []}' \
    | jq -r '.access_token')
  curl -s "http://localhost:8000/api/v1/verify?token=${TOKEN}" | jq '.valid'
  # Assert: Returns true

  # Test dashboard endpoint
  curl -s -H "Authorization: Bearer ${TOKEN}" http://localhost:8000/api/v1/dashboard | jq '.proofs | length'
  # Assert: Returns number >= 1

  # Test revoke endpoint
  PROOF_ID=$(curl -s -X POST http://localhost:8000/api/v1/onboard \
    -H "Content-Type: application/json" \
    -d '{"doc_data": "to revoke", "doc_type": "voter", "proof": {"pi_a": [], "pi_b": [[]], "pi_c": []}, "pub_signals": []}' \
    | jq -r '.proof_id')
  curl -s -X POST http://localhost:8000/api/v1/revoke \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"proof_id\": \"${PROOF_ID}\"}" | jq '.revoked'
  # Assert: Returns true

  # Kill server
  pkill -f "uvicorn app.main:app"
  ```

  **Commit**: YES
  - Message: `feat(api): add main API endpoints for proof lifecycle`
  - Files: `server/app/api/**`, `server/app/main.py`
  - Pre-commit: `cd server && python -c "from app.main import app"`

---

- [x] 8. Admin API Key Endpoints + Admin Login

  **What to do**:
  - Create `server/app/api/v1/endpoints/admin.py`:
    - `POST /admin/login` - authenticate admin user, return JWT with admin role
    - `POST /admin/api-keys` - create new API key (admin only)
    - `GET /admin/api-keys` - list all API keys (admin only)
    - `DELETE /admin/api-keys/{key_id}` - revoke API key (admin only)
  - Create `server/app/schemas/admin.py`:
    - `AdminLogin` - username, password
    - `AdminTokenResponse` - access_token, token_type (includes is_admin claim)
  - Update `server/app/api/v1/router.py` to include admin router
  - Admin user is seeded in Task 3 migration via env vars (ADMIN_USERNAME, ADMIN_PASSWORD)

  **Must NOT do**:
  - Do not expose API key secrets in list response (show only prefix)
  - Do not allow non-admin users to access these endpoints
  - Do not hardcode admin credentials (use env vars)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple CRUD endpoints following established patterns
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 9 after Task 5)
  - **Blocks**: Task 9
  - **Blocked By**: Task 5 (needs api_key CRUD)

  **References**:

  **Pattern References**:
  - Task 7: Endpoint patterns established there
  - Task 2: `security.py` has `create_access_token()` for JWT generation

  **API/Type References**:
  - Task 4: APIKeyCreate, APIKeyResponse schemas
  - Task 5: api_key CRUD functions, admin CRUD functions

  **Documentation References**:
  - Draft: Full admin CRUD for API keys
  - Task 3: Admin user seeded in migration with hashed password

  **WHY Each Reference Matters**:
  - Follow same patterns as Task 7 for consistency
  - Admin auth uses same JWT mechanism but with `is_admin=True` claim
  - Admin credentials come from env vars, hashed in migration

  **Acceptance Criteria**:

  ```bash
  # Verify admin endpoint file exists
  ls server/app/api/v1/endpoints/admin.py
  # Assert: File exists

  # Verify admin schema exists
  ls server/app/schemas/admin.py
  # Assert: File exists

  # Start server (with admin credentials from env)
  cd server && docker-compose up -d && sleep 10
  cd server && ADMIN_USERNAME=admin ADMIN_PASSWORD=admin-password uvicorn app.main:app --host 0.0.0.0 --port 8000 &
  sleep 5

  # Get admin token (credentials match env vars used in migration seeding)
  ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin-password"}' \
    | jq -r '.access_token')
  # Assert: ADMIN_TOKEN is not null/empty

  # Create API key
  curl -s -X POST http://localhost:8000/api/v1/admin/api-keys \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name": "test-service", "domain": "service.gov.in"}' \
    | jq '.key_id'
  # Assert: Returns key_id

  # List API keys
  curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    http://localhost:8000/api/v1/admin/api-keys | jq '.[0].name'
  # Assert: Returns "test-service"

  # Non-admin cannot access
  USER_TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/onboard \
    -H "Content-Type: application/json" \
    -d '{"doc_data": "test", "doc_type": "aadhaar", "proof": {"pi_a": [], "pi_b": [[]], "pi_c": []}, "pub_signals": []}' \
    | jq -r '.access_token')
  curl -s -H "Authorization: Bearer ${USER_TOKEN}" \
    http://localhost:8000/api/v1/admin/api-keys | jq '.detail'
  # Assert: Returns "Not authorized" or similar

  pkill -f "uvicorn app.main:app"
  ```

  **Commit**: YES
  - Message: `feat(admin): add API key management endpoints`
  - Files: `server/app/api/v1/endpoints/admin.py`
  - Pre-commit: Python import check

---

- [x] 9. Integration + Health Check Polish

  **What to do**:
  - Update `server/app/main.py` health endpoint to verify:
    - Public database connection
    - Private database connection
    - Redis connection
  - Add request ID middleware (X-Request-ID header)
  - Add global exception handler for sanitized error responses
  - Ensure CORS is properly configured for localhost:3000
  - Add OpenAPI metadata (title, description, version, contact)
  - Verify all endpoints work end-to-end

  **Must NOT do**:
  - Do not expose raw database errors
  - Do not log sensitive data in exception handler

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Polishing and integration work
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential, after 7, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 7, 8

  **References**:

  **Pattern References**:
  - FastAPI middleware docs: https://fastapi.tiangolo.com/tutorial/middleware/

  **Documentation References**:
  - User spec: CORS for localhost:3000
  - Metis review: Add X-Request-ID for tracing

  **WHY Each Reference Matters**:
  - Health check must verify all dependencies
  - Request ID enables distributed tracing

  **Acceptance Criteria**:

  ```bash
  # Start full stack
  cd server && docker-compose up -d && sleep 15
  cd server && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
  sleep 5

  # Health check shows all connections
  curl -s http://localhost:8000/health | jq '.'
  # Assert: Returns {"status": "healthy", "databases": {"public": "connected", "private": "connected"}, "redis": "connected"}

  # CORS headers present
  curl -s -I -X OPTIONS http://localhost:8000/api/v1/onboard \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin"
  # Assert: Returns "Access-Control-Allow-Origin: http://localhost:3000"

  # X-Request-ID header present
  curl -s -I http://localhost:8000/health | grep -i "x-request-id"
  # Assert: Header present with UUID value

  # OpenAPI docs accessible
  curl -s http://localhost:8000/openapi.json | jq '.info.title'
  # Assert: Returns "ConsentVault DPI API" or similar

  # Error responses are sanitized
  curl -s http://localhost:8000/api/v1/verify?token=invalid | jq '.detail'
  # Assert: Returns user-friendly error, not stack trace

  pkill -f "uvicorn app.main:app"
  ```

  **Commit**: YES
  - Message: `feat(integration): add health checks, middleware, and error handling`
  - Files: `server/app/main.py`
  - Pre-commit: Health check curl

---

- [x] 10. Documentation + QA Scripts

  **What to do**:
  - Update `server/README.md` with:
    - Project overview
    - Prerequisites (Docker, Python 3.11+)
    - Quick start guide (Windows + Linux/Mac)
    - Environment variables documentation
    - API endpoint documentation
    - Development workflow
  - Create `server/scripts/` directory
  - Create `server/scripts/qa-tests.sh`:
    - Full curl-based test suite
    - All endpoints covered
    - Assertions for expected responses
  - Create `server/scripts/seed-data.sh`:
    - Seed admin user
    - Seed sample trusted domains
    - Seed sample API key

  **Must NOT do**:
  - Do not create pytest tests (user declined)
  - Do not include real secrets in documentation

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation-focused task
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commit
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 9

  **References**:

  **Documentation References**:
  - All previous tasks for accurate documentation
  - User requirement: Windows compatibility instructions

  **WHY Each Reference Matters**:
  - Documentation must reflect actual implementation
  - Windows users need Docker Desktop specific instructions

  **Acceptance Criteria**:

  ```bash
  # README exists with content
  wc -l server/README.md
  # Assert: > 50 lines

  # README has required sections
  grep -E "^##.*(Prerequisites|Quick Start|Environment|API|Development)" server/README.md
  # Assert: All sections present

  # QA script exists and is executable
  ls -la server/scripts/qa-tests.sh
  # Assert: File exists

  # Seed script exists
  ls -la server/scripts/seed-data.sh
  # Assert: File exists

  # QA script runs successfully (with stack up)
  cd server && docker-compose up -d && sleep 15
  cd server && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
  sleep 5
  bash server/scripts/qa-tests.sh
  # Assert: Exit code 0

  pkill -f "uvicorn app.main:app"
  ```

  **Commit**: YES
  - Message: `docs: add comprehensive README and QA scripts`
  - Files: `server/README.md`, `server/scripts/*.sh`
  - Pre-commit: `bash -n server/scripts/qa-tests.sh`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(infra): add docker-compose with TimescaleDB, PostgreSQL, and Redis` | docker-compose.yml, .env.example, requirements.txt | docker-compose config |
| 2 | `feat(core): add config, database engines, and security utilities` | app/core/*.py | Python import |
| 3 | `feat(db): add Alembic migrations with TimescaleDB hypertables and RLS` | alembic/** | alembic check |
| 4 | `feat(schemas): add Pydantic schemas for proofs, consent, logs, and auth` | app/schemas/*.py | Python import |
| 5 | `feat(models): add SQLAlchemy models and CRUD operations` | app/models/*.py, app/crud/*.py | Python import |
| 6 | `feat(services): add vault, redis blacklist, and consent services` | app/services/*.py | Python import |
| 7 | `feat(api): add main API endpoints for proof lifecycle` | app/api/**, app/main.py | Start server |
| 8 | `feat(admin): add API key management endpoints` | app/api/v1/endpoints/admin.py | Python import |
| 9 | `feat(integration): add health checks, middleware, and error handling` | app/main.py | Health check |
| 10 | `docs: add comprehensive README and QA scripts` | README.md, scripts/*.sh | Script syntax |

---

## Success Criteria

### Verification Commands
```bash
# Full stack startup
cd server && docker-compose up -d && sleep 20

# Run migrations
cd server && alembic upgrade head

# Start server
cd server && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 5

# Health check
curl -s http://localhost:8000/health
# Expected: {"status": "healthy", "databases": {"public": "connected", "private": "connected"}, "redis": "connected"}

# Full onboard → verify → revoke → verify flow
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/onboard \
  -H "Content-Type: application/json" \
  -d '{"doc_data": "test document", "doc_type": "aadhaar", "proof": {"pi_a": [], "pi_b": [[]], "pi_c": []}, "pub_signals": []}')
TOKEN=$(echo $RESPONSE | jq -r '.access_token')
PROOF_ID=$(echo $RESPONSE | jq -r '.proof_id')

# Verify works
curl -s "http://localhost:8000/api/v1/verify?token=${TOKEN}"
# Expected: {"valid": true, ...}

# Revoke
curl -s -X POST http://localhost:8000/api/v1/revoke \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"proof_id\": \"${PROOF_ID}\"}"
# Expected: {"revoked": true}

# Verify fails after revoke
curl -s "http://localhost:8000/api/v1/verify?token=${TOKEN}"
# Expected: {"valid": false, "reason": "revoked"}

# Dashboard shows data
curl -s -H "Authorization: Bearer ${TOKEN}" http://localhost:8000/api/v1/dashboard
# Expected: {"proofs": [...], "logs": [...]}
```

### Final Checklist
- [x] All "Must Have" features present
- [x] All "Must NOT Have" guardrails respected
- [x] Docker Compose starts all services
- [x] Migrations run without errors
- [x] All endpoints respond correctly
- [x] Revocation propagates to verify endpoint
- [x] Audit logs capture all operations
- [x] CORS works for localhost:3000
- [x] Documentation is complete
