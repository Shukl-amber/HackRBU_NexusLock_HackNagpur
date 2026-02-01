# Frontend-Backend Integration Plan

## TL;DR

> **Quick Summary**: Integrate Next.js frontend with FastAPI backend by creating an integration branch, adding email/password auth to backend, extending dashboard API, and replacing all mock data with real API calls.
> 
> **Deliverables**:
> - Integration branch with both frontend and backend code
> - User authentication endpoints (signup, login, me)
> - Extended dashboard API with all required fields
> - Frontend connected to real backend APIs
> - Working end-to-end flow: signup -> login -> dashboard -> upload -> revoke
> 
> **Estimated Effort**: Large (2-3 days)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Git Setup -> Backend Schema -> Backend Auth -> Frontend Auth -> Full Integration

---

## Context

### Original Request
Create an integration branch from main, then implement production-ready integration of the Next.js frontend with the FastAPI backend.

### Interview Summary
**Key Discussions**:
- Authentication: Add email/password auth to FastAPI (ZKP remains for document onboarding only)
- Data Model: One user can have many documents (vs current one-user-per-document)
- API Extension: Backend needs to return purpose, requester, zkProofHash fields
- Upload Page: Document onboarding with ZKP flow
- CORS: Development only (localhost:3000 already configured)
- Testing: Manual verification only

**Research Findings**:
- CORS already configured in `server/app/core/config.py:29` for localhost:3000
- Password hashing (bcrypt) already exists in `server/app/core/security.py`
- JWT utilities already exist in `server/app/core/security.py`
- Frontend uses axios (already in package.json)
- Frontend branch has 4 commits to cherry-pick: `a6ffb7d`, `2cc8692`, `e33a2e4`, `a6f8751`
- Frontend branch deletes server/ (contains only README with "Hi")

### Metis Review
**Identified Gaps** (addressed with defaults):
- Token storage: DEFAULT -> localStorage (simpler, matches current frontend pattern)
- Orphaned proofs: DEFAULT -> Leave dangling (no migration complexity, proofs still work)
- Password requirements: DEFAULT -> Minimum 8 characters, no complexity rules
- Signup response: DEFAULT -> Return token + user object
- JWT expiry for users: DEFAULT -> 7 days (matches original proof tokens)
- Missing fields (purpose, requester, zkProofHash): DEFAULT -> Add to database schema

---

## Design Decisions

### 1. Token Storage
**Decision**: localStorage
**Rationale**: Matches existing frontend pattern (`auth.ts` uses localStorage). Production can enhance to httpOnly cookies later.

### 2. Orphaned Proof Strategy
**Decision**: Leave dangling (no migration)
**Rationale**: Existing proofs have UUID user_ids. New users table uses separate IDs. Old proofs still functional via their tokens. No data loss.

### 3. Missing Dashboard Fields
**Decision**: Add `purpose`, `requester` columns to proofs table. Derive `zkProofHash` from proof blob.
**Rationale**: Clean data model, backend returns everything frontend needs.

### 4. Password Requirements
**Decision**: Minimum 8 characters, validated in both frontend and backend.
**Rationale**: Balance security with UX. No complexity rules for MVP.

### 5. Signup/Login Response
**Decision**: Return both token AND user object `{ token, user: { id, email, name, createdAt } }`
**Rationale**: Frontend needs user info immediately, avoids extra API call.

### 6. JWT Token Expiry
**Decision**: 7 days for user tokens
**Rationale**: Consistent with existing proof token behavior.

### 7. Cherry-Pick Strategy
**Decision**: Cherry-pick commits individually in order
**Rationale**: 4 clean commits, frontend doesn't touch server/, should be conflict-free.

---

## Work Objectives

### Core Objective
Enable users to register, login, view their documents, upload new documents, and manage consent through a working frontend-backend integration.

### Concrete Deliverables
- `integration` branch on Git with merged code
- `server/app/models/user.py` - User model
- `server/app/api/v1/endpoints/auth.py` - Auth endpoints
- `server/alembic/versions/003_add_users.py` - Migration
- Updated `client/lib/api.ts` - Real API calls
- Updated `client/lib/auth.ts` - Real auth calls
- Working upload page connected to `/onboard`

### Definition of Done
- [x] `curl POST /api/v1/auth/signup` creates user and returns token
- [x] `curl POST /api/v1/auth/login` returns token for valid credentials
- [x] `curl GET /api/v1/dashboard` with token returns proofs array
- [x] Browser: Can complete signup -> login -> dashboard flow
- [x] Browser: Can upload document and see it in dashboard

### Must Have
- Email/password registration and login
- JWT-based session management
- Dashboard showing user's proofs
- Document upload with ZKP onboarding
- Proof revocation from dashboard

### Must NOT Have (Guardrails)
- Password reset functionality
- Email verification flow
- Refresh token mechanism
- Rate limiting
- Unified docker-compose
- Production deployment config
- Changes to existing admin auth
- Real ZKP circuit verification (keep mock)
- User account deletion
- Changes to existing proof creation logic beyond linking to user

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (for integration testing)
- **User wants tests**: Manual-only
- **Framework**: None

### Automated Verification (NO User Intervention)

All verification is agent-executable via:
- **Bash curl**: API endpoint testing
- **Playwright browser**: Frontend flow testing

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Git branch setup + cherry-pick

Wave 2 (After Wave 1):
├── Task 2: Backend user model + migration
└── Task 3: Extend proofs table (purpose, requester)

Wave 3 (After Wave 2):
├── Task 4: Backend auth endpoints
└── Task 5: Backend dashboard extension

Wave 4 (After Wave 3):
└── Task 6: Frontend auth integration

Wave 5 (After Wave 4):
├── Task 7: Frontend dashboard integration
└── Task 8: Frontend upload integration

Wave 6 (After Wave 5):
└── Task 9: End-to-end verification

Critical Path: Task 1 -> Task 2 -> Task 4 -> Task 6 -> Task 9
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 5 | 2 |
| 4 | 2 | 6 | 5 |
| 5 | 3 | 7 | 4 |
| 6 | 4 | 7, 8 | None |
| 7 | 5, 6 | 9 | 8 |
| 8 | 6 | 9 | 7 |
| 9 | 7, 8 | None | None (final) |

---

## TODOs

### Task 1: Git Branch Setup and Frontend Cherry-Pick

**What to do**:
1. Create `integration` branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b integration
   ```
2. Cherry-pick frontend commits in order:
   ```bash
   git cherry-pick a6ffb7d  # README additions
   git cherry-pick 2cc8692  # Frontend template
   git cherry-pick e33a2e4  # Package updates
   git cherry-pick a6f8751  # Auth, dashboard, upload pages
   ```
3. Verify server/ folder is intact (not deleted)
4. Verify client/ folder exists with all frontend code

**Must NOT do**:
- Merge the frontend branch directly (would delete server/)
- Cherry-pick as a range (may cause conflicts)
- Push to remote until all integration complete

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple git operations, clear steps, low complexity
- **Skills**: [`git-master`]
  - `git-master`: Cherry-pick operations require git expertise

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 1 (solo)
- **Blocks**: Tasks 2, 3
- **Blocked By**: None

**References**:

**Pattern References**:
- No existing patterns needed - standard git operations

**Documentation References**:
- Frontend commits: `a6ffb7d`, `2cc8692`, `e33a2e4`, `a6f8751`

**Acceptance Criteria**:

```bash
# Agent runs:
git branch --show-current
# Assert: Output is "integration"

ls server/app/main.py
# Assert: Exit code 0 (file exists)

ls client/app/auth/page.tsx
# Assert: Exit code 0 (file exists)

ls client/app/dashboard/page.tsx
# Assert: Exit code 0 (file exists)
```

**Commit**: YES
- Message: `chore: create integration branch with frontend code`
- Files: All cherry-picked files
- Pre-commit: None

---

### Task 2: Create User Model and Database Migration

**What to do**:
1. Create `server/app/models/user.py`:
   ```python
   from sqlalchemy import Column, String, DateTime
   from sqlalchemy.dialects.postgresql import UUID
   import uuid
   from datetime import datetime, timezone
   from app.core.database import Base

   class User(Base):
       __tablename__ = "users"
       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       email = Column(String(255), unique=True, nullable=False, index=True)
       password_hash = Column(String(255), nullable=False)
       name = Column(String(255), nullable=False)
       created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
   ```
2. Update `server/app/models/__init__.py` to export User
3. Create `server/app/crud/user.py` with:
   - `create_user(db, email, password_hash, name) -> User`
   - `get_user_by_email(db, email) -> User | None`
   - `get_user_by_id(db, user_id) -> User | None`
4. Create Alembic migration `003_add_users.py`:
   - Create users table
   - Add index on email

**Must NOT do**:
- Modify existing admin_users table
- Add foreign key from proofs to users (leave orphaned proofs alone)
- Add phone column (out of scope)

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: Standard CRUD and model creation, follows existing patterns
- **Skills**: `[]`
  - No special skills needed - standard Python/SQLAlchemy work

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 3)
- **Blocks**: Task 4
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `server/app/models/admin.py:1-18` - Model pattern to follow (same structure, different fields)
- `server/app/crud/admin.py:1-29` - CRUD pattern to follow
- `server/alembic/versions/001_initial_public.py:1-100` - Migration pattern

**API/Type References**:
- `server/app/core/database.py:Base` - SQLAlchemy Base class to import

**Acceptance Criteria**:

```bash
# Agent runs (in server container):
docker compose exec server python -c "from app.models.user import User; print(User.__tablename__)"
# Assert: Output is "users"

docker compose exec server alembic upgrade head
# Assert: Exit code 0

docker compose exec timescaledb psql -U postgres -d nexus_connect -c "\\d users"
# Assert: Output contains "email", "password_hash", "name", "created_at"
```

**Commit**: YES
- Message: `feat(backend): add users table and model`
- Files: `server/app/models/user.py`, `server/app/models/__init__.py`, `server/app/crud/user.py`, `server/alembic/versions/003_add_users.py`
- Pre-commit: `docker compose exec server alembic upgrade head`

---

### Task 3: Extend Proofs Table with Purpose and Requester

**What to do**:
1. Create Alembic migration `004_add_proof_fields.py`:
   ```python
   def upgrade():
       op.add_column('proofs', sa.Column('purpose', sa.String(500), nullable=True))
       op.add_column('proofs', sa.Column('requester', sa.String(255), nullable=True))
   
   def downgrade():
       op.drop_column('proofs', 'purpose')
       op.drop_column('proofs', 'requester')
   ```
2. Update `server/app/models/proof.py` to add:
   - `purpose = Column(String(500), nullable=True)`
   - `requester = Column(String(255), nullable=True)`
3. Update `server/app/schemas/proof.py` ProofCreate to accept purpose and requester
4. Update `server/app/crud/proof.py` create_proof to accept purpose and requester

**Must NOT do**:
- Change existing proof data
- Add NOT NULL constraints (would break existing data)
- Modify proof verification logic

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple column additions, minimal logic
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 2)
- **Blocks**: Task 5
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `server/app/models/proof.py:1-21` - Current proof model to extend
- `server/app/schemas/proof.py:ProofCreate` - Schema to update
- `server/alembic/versions/001_initial_public.py:50-80` - Migration pattern for proofs table

**Acceptance Criteria**:

```bash
# Agent runs:
docker compose exec server alembic upgrade head
# Assert: Exit code 0

docker compose exec timescaledb psql -U postgres -d nexus_connect -c "\\d proofs"
# Assert: Output contains "purpose" and "requester" columns
```

**Commit**: YES
- Message: `feat(backend): add purpose and requester fields to proofs`
- Files: `server/alembic/versions/004_add_proof_fields.py`, `server/app/models/proof.py`, `server/app/schemas/proof.py`, `server/app/crud/proof.py`
- Pre-commit: `docker compose exec server alembic upgrade head`

---

### Task 4: Implement Backend Auth Endpoints

**What to do**:
1. Create `server/app/schemas/user.py`:
   ```python
   class UserCreate(BaseModel):
       email: EmailStr
       password: str  # min 8 chars validated
       name: str
   
   class UserLogin(BaseModel):
       email: EmailStr
       password: str
   
   class UserResponse(BaseModel):
       id: str
       email: str
       name: str
       created_at: datetime
   
   class AuthResponse(BaseModel):
       access_token: str
       token_type: str = "bearer"
       user: UserResponse
   ```
2. Create `server/app/api/v1/endpoints/auth.py`:
   - `POST /signup`: Create user, hash password, return token + user
   - `POST /login`: Verify credentials, return token + user
   - `GET /me`: Return current user from token
3. Register router in `server/app/api/v1/router.py`
4. Add password validation (min 8 chars) in signup

**Must NOT do**:
- Modify existing admin auth in `endpoints/admin.py`
- Add email verification
- Add password reset
- Add rate limiting
- Change JWT secret or algorithm

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: Follows existing endpoint patterns, clear requirements
- **Skills**: `[]`
  - Standard FastAPI/Python work

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 5)
- **Blocks**: Task 6
- **Blocked By**: Task 2

**References**:

**Pattern References**:
- `server/app/api/v1/endpoints/admin.py:1-50` - Admin login pattern (similar JWT flow)
- `server/app/core/security.py:hash_password, verify_password` - Password hashing (lines ~80-100)
- `server/app/core/security.py:create_access_token` - JWT creation (lines ~50-70)
- `server/app/api/deps.py:get_current_user` - Token extraction pattern

**API/Type References**:
- `server/app/schemas/auth.py:TokenResponse` - Response pattern
- `server/app/schemas/admin.py:AdminLogin` - Login request pattern

**Acceptance Criteria**:

```bash
# Signup test:
curl -s -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' \
  | jq '.access_token'
# Assert: Returns non-empty string

# Login test:
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq '.user.email'
# Assert: Returns "test@example.com"

# Me test (use token from login):
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.access_token')
curl -s http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.email'
# Assert: Returns "test@example.com"

# Duplicate email test:
curl -s -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"another123","name":"Another"}' \
  | jq '.detail'
# Assert: Contains "already exists" or similar error
```

**Commit**: YES
- Message: `feat(backend): add user auth endpoints (signup, login, me)`
- Files: `server/app/schemas/user.py`, `server/app/api/v1/endpoints/auth.py`, `server/app/api/v1/router.py`, `server/app/schemas/__init__.py`
- Pre-commit: None

---

### Task 5: Extend Dashboard API Response

**What to do**:
1. Update `server/app/api/v1/endpoints/proof.py` dashboard endpoint:
   - Add `purpose` and `requester` to proof response
   - Add `zkProofHash` derived from proof blob: `hashlib.sha256(proof_bytes).hexdigest()[:40]`
   - Add `status` field: `"revoked"` if revoked, `"expired"` if past expiry, else `"active"`
2. Update response shape to match frontend expectations:
   ```python
   {
       "proofs": [{
           "id": str(p.id),
           "docType": p.doc_type,
           "purpose": p.purpose or "Document verification",
           "requester": p.requester or "Self",
           "expires": p.expiry.isoformat(),
           "status": calculate_status(p),
           "createdAt": p.created_at.isoformat(),
           "zkProofHash": derive_hash(p.proof)
       }],
       "logs": [...]
   }
   ```

**Must NOT do**:
- Change the authentication mechanism for dashboard
- Modify log response format
- Add new database queries beyond existing ones

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Response formatting change, minimal logic
- **Skills**: `[]`
  - No special skills needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 4)
- **Blocks**: Task 7
- **Blocked By**: Task 3

**References**:

**Pattern References**:
- `server/app/api/v1/endpoints/proof.py:302-349` - Current dashboard implementation

**API/Type References**:
- `client/types/index.ts:Proof` - Frontend expected shape (lines 43-54)

**Acceptance Criteria**:

```bash
# First create a user and get token:
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dash@test.com","password":"password123","name":"Dashboard Test"}' \
  | jq -r '.access_token')

# Get dashboard:
curl -s http://localhost:8000/api/v1/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq '.proofs[0] | keys'
# Assert: Output contains "id", "docType", "purpose", "requester", "expires", "status", "createdAt", "zkProofHash"
# (Will be empty array if no proofs, which is valid)
```

**Commit**: YES
- Message: `feat(backend): extend dashboard response with frontend-expected fields`
- Files: `server/app/api/v1/endpoints/proof.py`
- Pre-commit: None

---

### Task 6: Frontend Auth Integration

**What to do**:
1. Create `client/.env.local` from example with `NEXT_PUBLIC_API_URL=http://localhost:8000`
2. Update `client/lib/auth.ts`:
   - Replace mock `loginUser` with real API call to `/api/v1/auth/login`
   - Replace mock `signupUser` with real API call to `/api/v1/auth/signup`
   - Replace mock `validateToken` with real API call to `/api/v1/auth/me`
   - Update type imports to match new response shape
3. Update `client/lib/auth-context.tsx`:
   - Ensure it works with new auth.ts functions
   - Add proper error handling for network failures
4. Update `client/types/index.ts` if needed to match backend responses

**Must NOT do**:
- Change the UI design of auth pages
- Add refresh token logic
- Add "remember me" functionality
- Modify localStorage key names

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: API integration, follows existing patterns
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: React/Next.js API integration patterns

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (solo)
- **Blocks**: Tasks 7, 8
- **Blocked By**: Task 4

**References**:

**Pattern References**:
- `client/lib/auth.ts:1-158` - Current mock auth to replace
- `client/lib/auth-context.tsx:1-108` - Context provider structure
- `client/.env.local.example` - Environment variable template

**API/Type References**:
- `client/types/index.ts:LoginRequest, SignupRequest, AuthResponse` - Types to verify match

**Acceptance Criteria**:

```
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000/auth
2. Fill: input[name="name"] with "Integration Test"
3. Fill: input[name="email"] with "playwright@test.com"
4. Fill: input[name="password"] with "password123"
5. Click: button containing "Sign Up" text
6. Wait for: URL to change to /dashboard OR success toast
7. Assert: localStorage contains "consent_vault_token"
8. Screenshot: .sisyphus/evidence/task-6-signup-success.png

# Logout and login test:
9. Clear localStorage
10. Navigate to: http://localhost:3000/auth
11. Click: element to switch to login mode
12. Fill: input[name="email"] with "playwright@test.com"
13. Fill: input[name="password"] with "password123"
14. Click: button containing "Login" text
15. Wait for: URL to change to /dashboard
16. Screenshot: .sisyphus/evidence/task-6-login-success.png
```

**Commit**: YES
- Message: `feat(frontend): connect auth to real backend API`
- Files: `client/lib/auth.ts`, `client/lib/auth-context.tsx`, `client/.env.local`
- Pre-commit: None

---

### Task 7: Frontend Dashboard Integration

**What to do**:
1. Update `client/lib/api.ts`:
   - Replace mock `getProofs` with real API call to `/api/v1/dashboard`
   - Replace mock `getAccessLogs` with data from dashboard response
   - Replace mock `revokeProof` with real API call to `/api/v1/revoke`
   - Keep utility functions (formatTime, getDocIcon, etc.)
2. Update `client/app/dashboard/page.tsx`:
   - Fetch from real API on mount
   - Handle loading state (use existing pattern or add skeleton)
   - Handle error state (show error message)
   - Handle empty state (no proofs yet)
3. Ensure Bearer token is sent with all authenticated requests

**Must NOT do**:
- Redesign dashboard UI
- Add new features not in current mock
- Change the revoke all proofs functionality (keep but connect to real API)
- Add polling/real-time updates

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: API integration following existing patterns
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: React data fetching and state management

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 5 (with Task 8)
- **Blocks**: Task 9
- **Blocked By**: Tasks 5, 6

**References**:

**Pattern References**:
- `client/lib/api.ts:1-216` - Current mock API to replace
- `client/app/dashboard/page.tsx:1-100` - Dashboard component fetching data

**API/Type References**:
- `client/types/index.ts:Proof, AccessLog` - Types for API responses

**Acceptance Criteria**:

```
# Agent executes via playwright browser automation:
# (Assumes user from Task 6 exists and has token)

1. Navigate to: http://localhost:3000/auth
2. Login as playwright@test.com
3. Wait for: navigation to /dashboard
4. Assert: Page contains "Dashboard" heading OR proof list container
5. If proofs exist: Assert proof cards are rendered with docType visible
6. If no proofs: Assert empty state message is shown
7. Screenshot: .sisyphus/evidence/task-7-dashboard-loaded.png

# Verify API call made:
8. Check network tab or console for successful /api/v1/dashboard call
```

**Commit**: YES
- Message: `feat(frontend): connect dashboard to real backend API`
- Files: `client/lib/api.ts`, `client/app/dashboard/page.tsx`
- Pre-commit: None

---

### Task 8: Frontend Upload Integration

**What to do**:
1. Update `client/app/upload/page.tsx`:
   - Connect form submission to `/api/v1/onboard` endpoint
   - Add purpose and requester fields to form (if not present)
   - Send Bearer token with request
   - Handle success (show toast, redirect to dashboard)
   - Handle error (show error message)
2. Mock ZKP proof generation (placeholder for now):
   ```typescript
   const mockProof = {
     pi_a: ["0x1234..."],
     pi_b: [["0x5678..."], ["0x9abc..."]],
     pi_c: ["0xdef0..."],
     protocol: "groth16"
   };
   const mockPubSignals = ["signal1", "signal2"];
   ```
3. Ensure form validates before submission

**Must NOT do**:
- Implement real ZKP circuit (use mock)
- Add file upload (doc_data is text for MVP)
- Change the page layout significantly

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: Form integration with API
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Form handling and API integration

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 5 (with Task 7)
- **Blocks**: Task 9
- **Blocked By**: Task 6

**References**:

**Pattern References**:
- `client/app/upload/page.tsx:1-368` - Current upload page to modify
- `server/app/api/v1/endpoints/proof.py:28-109` - Onboard endpoint contract

**API/Type References**:
- `server/app/schemas/proof.py:ProofCreate` - Expected request shape

**Acceptance Criteria**:

```
# Agent executes via playwright browser automation:

1. Navigate to: http://localhost:3000/auth
2. Login as playwright@test.com
3. Navigate to: http://localhost:3000/upload
4. Fill: doc_type dropdown with "PAN" or similar
5. Fill: purpose field with "Tax filing"
6. Fill: requester field with "tax.gov.in"
7. Fill: doc_data field with "test document data"
8. Click: submit button
9. Wait for: success toast OR redirect to dashboard
10. Screenshot: .sisyphus/evidence/task-8-upload-success.png

# Verify proof created:
11. Navigate to: /dashboard
12. Assert: New proof appears in list with "Tax filing" purpose
13. Screenshot: .sisyphus/evidence/task-8-proof-in-dashboard.png
```

**Commit**: YES
- Message: `feat(frontend): connect upload page to onboard API`
- Files: `client/app/upload/page.tsx`
- Pre-commit: None

---

### Task 9: End-to-End Verification

**What to do**:
1. Full flow verification script (manual or Playwright):
   - Create new user (signup)
   - Login with new user
   - View empty dashboard
   - Upload document (onboard)
   - View dashboard with new proof
   - Revoke proof
   - View dashboard with revoked status
   - Logout
   - Login again
   - Verify session persists
2. Document any issues found
3. Create verification report in `.sisyphus/evidence/e2e-report.md`

**Must NOT do**:
- Fix unrelated bugs discovered
- Add new features
- Modify code (verification only)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Verification only, no implementation
- **Skills**: [`playwright`]
  - `playwright`: Browser automation for E2E testing

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 6 (solo, final)
- **Blocks**: None (final task)
- **Blocked By**: Tasks 7, 8

**References**:

**Documentation References**:
- All previous task acceptance criteria

**Acceptance Criteria**:

```
# Full E2E flow via playwright:

1. Navigate to: http://localhost:3000
2. Click: Get Started / Auth link
3. Sign up with unique email
4. Assert: Redirected to dashboard
5. Assert: Dashboard shows empty state or loading
6. Navigate to: /upload
7. Fill and submit upload form
8. Assert: Success feedback
9. Navigate to: /dashboard
10. Assert: New proof visible
11. Click: Revoke button on proof
12. Assert: Proof status changes to "revoked"
13. Logout (if button exists) or clear localStorage
14. Login again
15. Assert: Dashboard shows same proofs

# Evidence:
16. Screenshot: .sisyphus/evidence/e2e-1-signup.png
17. Screenshot: .sisyphus/evidence/e2e-2-dashboard-empty.png
18. Screenshot: .sisyphus/evidence/e2e-3-upload.png
19. Screenshot: .sisyphus/evidence/e2e-4-dashboard-with-proof.png
20. Screenshot: .sisyphus/evidence/e2e-5-proof-revoked.png

# Create report:
Write .sisyphus/evidence/e2e-report.md with:
- Test date
- All steps passed/failed
- Screenshots taken
- Any issues discovered
```

**Commit**: YES
- Message: `docs: add e2e verification evidence`
- Files: `.sisyphus/evidence/*`
- Pre-commit: None

---

## Commit Strategy

| After Task | Message | Key Files | Verification |
|------------|---------|-----------|--------------|
| 1 | `chore: create integration branch with frontend code` | client/* | ls server/ client/ |
| 2 | `feat(backend): add users table and model` | models/user.py, crud/user.py, migration | alembic upgrade |
| 3 | `feat(backend): add purpose and requester fields to proofs` | models/proof.py, migration | alembic upgrade |
| 4 | `feat(backend): add user auth endpoints (signup, login, me)` | endpoints/auth.py | curl tests |
| 5 | `feat(backend): extend dashboard response` | endpoints/proof.py | curl test |
| 6 | `feat(frontend): connect auth to real backend API` | lib/auth.ts | playwright |
| 7 | `feat(frontend): connect dashboard to real backend API` | lib/api.ts | playwright |
| 8 | `feat(frontend): connect upload page to onboard API` | app/upload/page.tsx | playwright |
| 9 | `docs: add e2e verification evidence` | .sisyphus/evidence/* | N/A |

---

## Success Criteria

### Verification Commands

```bash
# Backend health:
curl http://localhost:8000/health
# Expected: {"status":"healthy",...}

# Signup:
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"final@test.com","password":"password123","name":"Final Test"}'
# Expected: {"access_token":"...", "user": {...}}

# Dashboard:
curl http://localhost:8000/api/v1/dashboard \
  -H "Authorization: Bearer <token>"
# Expected: {"proofs": [...], "logs": [...]}
```

### Final Checklist
- [x] Integration branch exists with both frontend and backend code
- [x] Users can sign up with email/password
- [x] Users can login and receive JWT
- [x] Dashboard shows user's proofs with all expected fields
- [x] Upload page creates new proofs
- [x] Revoke button revokes proofs
- [x] Session persists on page refresh
- [x] No password reset (explicitly excluded)
- [x] No email verification (explicitly excluded)
- [x] No unified docker-compose (explicitly excluded)
