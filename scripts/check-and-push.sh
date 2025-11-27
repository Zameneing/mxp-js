#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if commit message is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Commit message required${NC}"
    echo ""
    echo "Usage: $0 \"your commit message\""
    echo ""
    echo "Examples:"
    echo "  $0 \"fix: resolve crypto issue\""
    echo "  $0 \"feat: add new streaming API\""
    echo "  $0 \"chore: update dependencies\""
    exit 1
fi

COMMIT_MSG="$1"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  MXP-JS Check & Push Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Type Check
echo -e "${YELLOW}[1/4]${NC} Running type check..."
if pnpm typecheck; then
    echo -e "${GREEN}✓ Type check passed${NC}"
else
    echo -e "${RED}✗ Type check failed${NC}"
    exit 1
fi
echo ""

# Step 2: Lint
echo -e "${YELLOW}[2/4]${NC} Running linter..."
if pnpm lint; then
    echo -e "${GREEN}✓ Lint passed${NC}"
else
    echo -e "${RED}✗ Lint failed${NC}"
    exit 1
fi
echo ""

# Step 3: Test
echo -e "${YELLOW}[3/4]${NC} Running tests..."
if pnpm test; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi
echo ""

# Step 4: Build
echo -e "${YELLOW}[4/4]${NC} Building..."
if pnpm build; then
    echo -e "${GREEN}✓ Build passed${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}All checks passed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if there are changes to commit
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

# Git operations
echo -e "${YELLOW}Staging changes...${NC}"
git add -A

echo -e "${YELLOW}Committing with message:${NC} $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo -e "${YELLOW}Pushing to origin main...${NC}"
git push origin main

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Successfully pushed to GitHub!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

