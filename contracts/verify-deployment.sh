#!/bin/bash
# MISTHOS Pre-Deployment Verification Script
# Run this script to verify the program is ready for mainnet deployment
# Usage: ./verify-deployment.sh

set -e

echo "================================"
echo "MISTHOS Deployment Verification"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for checks
PASSED=0
FAILED=0

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $1"
        ((FAILED++))
    fi
}

# Function to warn
check_warn() {
    if [ $? -eq 0 ]; then
        echo -e "${YELLOW}⚠ WARN${NC}: $1"
        return 1
    else
        echo -e "${GREEN}✓ PASS${NC}: $1 (no issues found)"
        ((PASSED++))
    fi
}

echo "📋 Environment Checks"
echo "--------------------"

# Check Solana CLI
command -v solana >/dev/null 2>&1
check_status "Solana CLI installed"

# Check Anchor CLI
command -v anchor >/dev/null 2>&1
check_status "Anchor CLI installed"

# Check Rust
command -v rustc >/dev/null 2>&1
check_status "Rust installed"

echo ""
echo "🔧 Version Checks"
echo "------------------"

# Check Anchor version (should be 0.31.1)
ANCHOR_VERSION=$(anchor --version 2>/dev/null | grep -oP '0\.\d+\.\d+' | head -1)
if [[ "$ANCHOR_VERSION" == "0.31.1" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: Anchor version is $ANCHOR_VERSION"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Anchor version is $ANCHOR_VERSION (expected 0.31.1)"
    ((FAILED++))
fi

# Check if in contracts directory
if [[ -f "Anchor.toml" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: Located in contracts directory"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Not in contracts directory (need Anchor.toml)"
    ((FAILED++))
    exit 1
fi

echo ""
echo "🔍 Build Checks"
echo "---------------"

# Check for compiler warnings
echo "Running: cargo clippy --all-targets --all-features..."
if cargo clippy --all-targets --all-features -- -D warnings 2>&1 | grep -q "warning\|error"; then
    echo -e "${RED}✗ FAIL${NC}: Clippy found warnings"
    ((FAILED++))
else
    echo -e "${GREEN}✓ PASS${NC}: No clippy warnings"
    ((PASSED++))
fi

# Check for security vulnerabilities
echo "Running: cargo audit..."
if cargo audit 2>&1 | grep -q "found"; then
    echo -e "${RED}✗ FAIL${NC}: Cargo audit found vulnerabilities"
    ((FAILED++))
else
    echo -e "${GREEN}✓ PASS${NC}: No cargo audit vulnerabilities"
    ((PASSED++))
fi

# Build the program
echo "Building program..."
if cargo build --release 2>&1 >/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}: Program builds successfully"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Program build failed"
    ((FAILED++))
fi

echo ""
echo "✅ Test Checks"
echo "--------------"

# Run tests
echo "Running: cargo test --release..."
TEST_OUTPUT=$(cargo test --release 2>&1 | tail -20)

# Count passing tests
TEST_COUNT=$(echo "$TEST_OUTPUT" | grep "test result:" | grep -oP '\d+(?= passed)')
if [[ -n "$TEST_COUNT" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: $TEST_COUNT tests passing"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Could not determine test results"
    ((FAILED++))
fi

# Check for test failures
if echo "$TEST_OUTPUT" | grep -q "FAILED\|failed"; then
    echo -e "${RED}✗ FAIL${NC}: Some tests failed"
    ((FAILED++))
else
    echo -e "${GREEN}✓ PASS${NC}: All tests passed"
    ((PASSED++))
fi

echo ""
echo "📦 Dependency Checks"
echo "-------------------"

# Check anchor-lang version
if grep -q 'anchor-lang = { version = "0.31.1"' programs/workspace/Cargo.toml; then
    echo -e "${GREEN}✓ PASS${NC}: anchor-lang version is 0.31.1"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: anchor-lang version mismatch"
    ((FAILED++))
fi

# Check anchor-spl version
if grep -q 'anchor-spl = "0.31.1"' programs/workspace/Cargo.toml; then
    echo -e "${GREEN}✓ PASS${NC}: anchor-spl version is 0.31.1"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: anchor-spl version mismatch"
    ((FAILED++))
fi

# Check Anchor.toml version
if grep -q 'anchor_version = "0.31.1"' Anchor.toml; then
    echo -e "${GREEN}✓ PASS${NC}: Anchor.toml version is 0.31.1"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Anchor.toml version mismatch (should be 0.31.1)"
    ((FAILED++))
fi

echo ""
echo "📄 Documentation Checks"
echo "----------------------"

# Check for deployment docs
if [[ -f "../Docs/DEPLOYMENT_MAINNET.md" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: DEPLOYMENT_MAINNET.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: DEPLOYMENT_MAINNET.md missing"
    ((FAILED++))
fi

# Check for security audit doc
if [[ -f "../Docs/SECURITY_AUDIT.md" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: SECURITY_AUDIT.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: SECURITY_AUDIT.md missing"
    ((FAILED++))
fi

# Check for quick reference
if [[ -f "../Docs/QUICK_LAUNCH_REFERENCE.md" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: QUICK_LAUNCH_REFERENCE.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: QUICK_LAUNCH_REFERENCE.md missing"
    ((FAILED++))
fi

echo ""
echo "🎯 IDL Checks"
echo "-------------"

# Check if IDL exists
if [[ -f "target/idl/workspace.json" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: IDL generated (target/idl/workspace.json)"
    ((PASSED++))
    
    # Check IDL has instructions
    INSTRUCTION_COUNT=$(grep -c '"name":' target/idl/workspace.json || true)
    if [[ $INSTRUCTION_COUNT -gt 0 ]]; then
        echo -e "${GREEN}✓ PASS${NC}: IDL contains $INSTRUCTION_COUNT instructions"
        ((PASSED++))
    fi
else
    echo -e "${RED}✗ FAIL${NC}: IDL not generated"
    ((FAILED++))
fi

echo ""
echo "⚙️  Optional Checks"
echo "------------------"

# Check for .env or configuration
if [[ -f ".env" ]] || [[ -f ".env.local" ]]; then
    echo -e "${YELLOW}ℹ INFO${NC}: Environment file found"
else
    echo -e "${YELLOW}⚠ WARN${NC}: No .env file found (may need for deployment)"
fi

# Check for git
if command -v git >/dev/null 2>&1; then
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    if [[ $COMMIT_COUNT -gt 0 ]]; then
        echo -e "${GREEN}✓ INFO${NC}: Git repository with $COMMIT_COUNT commits"
    fi
fi

echo ""
echo "================================"
echo "VERIFICATION RESULTS"
echo "================================"
echo -e "✓ Passed: ${GREEN}$PASSED${NC}"
echo -e "✗ Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🚀 READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review: ../Docs/QUICK_LAUNCH_REFERENCE.md"
    echo "2. Create mainnet keypair: solana-keygen new --outfile ~/mainnet-deployer.json"
    echo "3. Ensure 5+ SOL in account"
    echo "4. Run: anchor deploy --provider.cluster mainnet-beta"
    echo "5. Test on mainnet-beta with frontend"
    echo "6. Deploy to production: anchor deploy --provider.cluster mainnet"
    echo ""
    exit 0
else
    echo -e "${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "Please fix the $FAILED failing check(s) before proceeding."
    echo ""
    exit 1
fi
