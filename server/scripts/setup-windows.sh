#!/bin/bash

# ConsentVault DPI - Automated Setup Script
# This script sets up the project entirely within Docker

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ConsentVault DPI - Automated Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if we're in WSL
if ! grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null; then
    echo -e "${YELLOW}Warning: This doesn't appear to be WSL. This script is optimized for WSL environments.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if we're in /mnt/c/ or similar Windows mount
CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" == /mnt/* ]]; then
    echo -e "${RED}Error: You are in a Windows mount directory ($CURRENT_DIR)${NC}"
    echo -e "${RED}PostgreSQL has permission issues when data is stored in /mnt/c/${NC}\n"
    echo -e "${YELLOW}Solution: Copy project to WSL home directory${NC}\n"
    
    # Suggest project name from current directory
    PROJECT_NAME=$(basename "$CURRENT_DIR")
    WSL_TARGET="$HOME/$PROJECT_NAME"
    
    echo -e "Recommended steps:"
    echo -e "1. Copy project to WSL home:"
    echo -e "   ${GREEN}cp -r \"$CURRENT_DIR\" \"$WSL_TARGET\"${NC}"
    echo -e "2. Change to the new directory:"
    echo -e "   ${GREEN}cd \"$WSL_TARGET\"${NC}"
    echo -e "3. Run this setup script again:"
    echo -e "   ${GREEN}bash scripts/setup-windows.sh${NC}\n"
    
    read -p "Would you like to copy the project now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Copying project to $WSL_TARGET...${NC}"
        
        # Create parent directory if needed
        mkdir -p "$(dirname "$WSL_TARGET")"
        
        # Copy project
        cp -r "$CURRENT_DIR" "$WSL_TARGET"
        
        echo -e "${GREEN}✓ Project copied successfully!${NC}\n"
        echo -e "Now run:"
        echo -e "  ${GREEN}cd \"$WSL_TARGET\"${NC}"
        echo -e "  ${GREEN}bash scripts/setup-windows.sh${NC}\n"
        exit 0
    else
        echo -e "${RED}Setup aborted. Please manually copy the project to WSL home directory.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Running from WSL directory: $CURRENT_DIR${NC}\n"

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

MISSING_DEPS=()

if ! command -v docker &> /dev/null; then
    MISSING_DEPS+=("docker")
fi

if ! command -v docker-compose &> /dev/null; then
    # Check for docker compose (without hyphen)
    if ! docker compose version &> /dev/null; then
        MISSING_DEPS+=("docker-compose")
    fi
fi

if ! command -v python3 &> /dev/null; then
    MISSING_DEPS+=("python3")
fi

if ! command -v pip3 &> /dev/null; then
    MISSING_DEPS+=("pip3")
fi

if ! command -v curl &> /dev/null; then
    MISSING_DEPS+=("curl")
fi

if ! command -v jq &> /dev/null; then
    MISSING_DEPS+=("jq")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing dependencies: ${MISSING_DEPS[*]}${NC}\n"
    echo -e "${YELLOW}Install them with:${NC}"
    echo -e "  sudo apt update"
    echo -e "  sudo apt install -y ${MISSING_DEPS[*]}"
    echo ""
    
    # Special note for Docker on WSL
    if [[ " ${MISSING_DEPS[*]} " =~ " docker " ]]; then
        echo -e "${BLUE}Note: For Docker on WSL2, you can:${NC}"
        echo -e "  1. Install Docker Desktop for Windows (recommended)"
        echo -e "  2. Enable WSL2 integration in Docker Desktop settings"
        echo -e "  OR"
        echo -e "  3. Install Docker directly in WSL: https://docs.docker.com/engine/install/ubuntu/${NC}\n"
    fi
    
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}\n"

# Step 2: Check environment file
echo -e "${YELLOW}[2/7] Setting up environment variables...${NC}"

if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file from template...${NC}"
    cp .env.example .env
    
    # Generate random keys
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    MASTER_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # Update .env with generated keys (using sed that works in WSL)
    sed -i "s|your-secret-key-min-32-characters-long-here|$SECRET_KEY|g" .env
    sed -i "s|your-master-key-min-32-characters-long-here|$MASTER_KEY|g" .env
    
    echo -e "${GREEN}✓ Created .env file with generated keys${NC}"
    echo -e "${YELLOW}⚠ Review .env and update ADMIN_PASSWORD before production use!${NC}\n"
else
    echo -e "${GREEN}✓ .env file already exists${NC}\n"
fi

# Step 2.1: Ensure docker_data is ignored
if ! grep -q "docker_data/" .gitignore; then
    echo -e "${BLUE}Adding docker_data/ to .gitignore...${NC}"
    echo -e "\n# Local data\ndocker_data/" >> .gitignore
fi

# Step 3: Start Docker services
echo -e "${YELLOW}[3/7] Starting Docker services...${NC}"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker daemon is not running${NC}"
    echo -e "${YELLOW}Start Docker Desktop (Windows) or Docker service (WSL)${NC}\n"
    exit 1
fi

# Use docker compose or docker-compose based on availability
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${BLUE}Using: $DOCKER_COMPOSE${NC}"

# Build and start services
$DOCKER_COMPOSE up -d --build

echo -e "${GREEN}✓ Docker services started${NC}\n"

# Step 4: Wait for databases and server
echo -e "${YELLOW}[4/7] Waiting for services to initialize...${NC}"
echo -e "${BLUE}This may take 30-40 seconds on first run...${NC}"

MAX_RETRIES=60
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if $DOCKER_COMPOSE exec -T timescaledb pg_isready -U postgres &> /dev/null && \
       $DOCKER_COMPOSE exec -T postgres-private pg_isready -U postgres &> /dev/null && \
       $DOCKER_COMPOSE exec -T server curl -s http://localhost:8000/health &> /dev/null; then
        echo -e "${GREEN}✓ All services are ready${NC}\n"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "\n${RED}✗ Services failed to start within timeout${NC}"
    echo -e "${YELLOW}Check logs with: $DOCKER_COMPOSE logs${NC}\n"
    exit 1
fi

# Step 5: (Skipped) Local Python dependencies
echo -e "${YELLOW}[5/7] Python dependencies are managed within Docker.${NC}"
echo -e "${GREEN}✓ Skipping local installation${NC}\n"

# Step 6: Run database migrations
echo -e "${YELLOW}[6/7] Running database migrations...${NC}"

# Databases are already created by server health checks or env config usually, 
# but let's ensure they exist as the server expects them.
$DOCKER_COMPOSE exec -T timescaledb psql -U postgres -c "CREATE DATABASE consentvault;" || true
$DOCKER_COMPOSE exec -T postgres-private psql -U postgres -c "CREATE DATABASE consentvault_private;" || true

# Enable TimescaleDB extension
$DOCKER_COMPOSE exec -T timescaledb psql -U postgres -d consentvault -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || true

# Run migrations via Docker
$DOCKER_COMPOSE exec -T server alembic upgrade head

echo -e "${GREEN}✓ Database migrations completed${NC}\n"

# Step 7: Seed data
echo -e "${YELLOW}[7/7] Seeding initial data...${NC}"

# Run seed script (it now uses Docker internally for DB calls and hits the server)
bash scripts/seed-data.sh

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Setup completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "Next steps:"
echo -e "1. ${YELLOW}Access the API:${NC}"
echo -e "   ${GREEN}http://localhost:8000${NC}"
echo -e "   ${GREEN}http://localhost:8000/docs${NC} (Swagger UI)"
echo -e ""
echo -e "2. ${YELLOW}Run tests:${NC}"
echo -e "   ${GREEN}bash scripts/qa-tests.sh${NC}"
echo -e ""
echo -e "3. ${YELLOW}View logs:${NC}"
echo -e "   ${GREEN}$DOCKER_COMPOSE logs -f${NC}"
echo -e ""
echo -e "4. ${YELLOW}Stop services:${NC}"
echo -e "   ${GREEN}$DOCKER_COMPOSE down${NC}"
echo -e ""

exit 0
