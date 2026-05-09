# MISTHOS Pre-Deployment Verification Script (Windows PowerShell)
# Run this script to verify the program is ready for mainnet deployment
# Usage: .\verify-deployment.ps1

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "MISTHOS Deployment Verification" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Counters
$passed = 0
$failed = 0

# Function to check command status
function Check-Status {
    param (
        [string]$description,
        [scriptblock]$testBlock,
        [bool]$isCritical = $true
    )
    
    try {
        $result = & $testBlock
        if ($result) {
            Write-Host "✓ PASS: $description" -ForegroundColor Green
            $script:passed++
            return $true
        }
        else {
            Write-Host "✗ FAIL: $description" -ForegroundColor Red
            $script:failed++
            return $false
        }
    }
    catch {
        Write-Host "✗ FAIL: $description - $_" -ForegroundColor Red
        $script:failed++
        return $false
    }
}

# === Environment Checks ===
Write-Host "📋 Environment Checks" -ForegroundColor Yellow
Write-Host "--------------------" -ForegroundColor Yellow

# Check Solana CLI
Check-Status "Solana CLI installed" { Test-Command "solana" }

# Check Anchor CLI
Check-Status "Anchor CLI installed" { Test-Command "anchor" }

# Check Rust
Check-Status "Rust installed" { Test-Command "rustc" }

# Helper function to test if command exists
function Test-Command {
    param([string]$command)
    try {
        & $command --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

Write-Host ""
Write-Host "🔧 Version Checks" -ForegroundColor Yellow
Write-Host "------------------" -ForegroundColor Yellow

# Check Anchor version
try {
    $anchorVersion = anchor --version 2>$null | Select-String -Pattern '0\.\d+\.\d+' -AllMatches | ForEach-Object { $_.Matches[0].Value }
    if ($anchorVersion -eq "0.31.1") {
        Write-Host "✓ PASS: Anchor version is $anchorVersion" -ForegroundColor Green
        $passed++
    }
    else {
        Write-Host "✗ FAIL: Anchor version is $anchorVersion (expected 0.31.1)" -ForegroundColor Red
        $failed++
    }
}
catch {
    Write-Host "✗ FAIL: Could not check Anchor version - $_" -ForegroundColor Red
    $failed++
}

# Check if in contracts directory
if (Test-Path "Anchor.toml") {
    Write-Host "✓ PASS: Located in contracts directory" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: Not in contracts directory (need Anchor.toml)" -ForegroundColor Red
    $failed++
    exit 1
}

Write-Host ""
Write-Host "🔍 Build Checks" -ForegroundColor Yellow
Write-Host "---------------" -ForegroundColor Yellow

# Check for compiler warnings
Write-Host "Running: cargo clippy --all-targets --all-features..." -ForegroundColor Gray
$clippy_output = cargo clippy --all-targets --all-features 2>&1
if ($clippy_output -match "warning|error") {
    Write-Host "✗ FAIL: Clippy found warnings" -ForegroundColor Red
    $failed++
}
else {
    Write-Host "✓ PASS: No clippy warnings" -ForegroundColor Green
    $passed++
}

# Check for security vulnerabilities
Write-Host "Running: cargo audit..." -ForegroundColor Gray
$audit_output = cargo audit 2>&1
if ($audit_output -match "found") {
    Write-Host "✗ FAIL: Cargo audit found vulnerabilities" -ForegroundColor Red
    $failed++
}
else {
    Write-Host "✓ PASS: No cargo audit vulnerabilities" -ForegroundColor Green
    $passed++
}

# Build the program
Write-Host "Building program..." -ForegroundColor Gray
try {
    cargo build --release 2>&1 | Out-Null
    Write-Host "✓ PASS: Program builds successfully" -ForegroundColor Green
    $passed++
}
catch {
    Write-Host "✗ FAIL: Program build failed" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "✅ Test Checks" -ForegroundColor Yellow
Write-Host "--------------" -ForegroundColor Yellow

# Run tests
Write-Host "Running: cargo test --release..." -ForegroundColor Gray
$test_output = cargo test --release 2>&1 | Select-Object -Last 20
$test_count = ($test_output -match "test result:" | Select-String -Pattern '\d+(?= passed)' -AllMatches).Matches.Value

if ($test_count) {
    Write-Host "✓ PASS: $test_count tests passing" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: Could not determine test results" -ForegroundColor Red
    $failed++
}

# Check for test failures
if ($test_output -match "FAILED|failed") {
    Write-Host "✗ FAIL: Some tests failed" -ForegroundColor Red
    $failed++
}
else {
    Write-Host "✓ PASS: All tests passed" -ForegroundColor Green
    $passed++
}

Write-Host ""
Write-Host "📦 Dependency Checks" -ForegroundColor Yellow
Write-Host "-------------------" -ForegroundColor Yellow

# Check anchor-lang version
$cargoContent = Get-Content "programs\workspace\Cargo.toml" -Raw
if ($cargoContent -match 'anchor-lang = \{ version = "0\.31\.1"') {
    Write-Host "✓ PASS: anchor-lang version is 0.31.1" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: anchor-lang version mismatch" -ForegroundColor Red
    $failed++
}

# Check anchor-spl version
if ($cargoContent -match 'anchor-spl = "0\.31\.1"') {
    Write-Host "✓ PASS: anchor-spl version is 0.31.1" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: anchor-spl version mismatch" -ForegroundColor Red
    $failed++
}

# Check Anchor.toml version
$anchorToml = Get-Content "Anchor.toml" -Raw
if ($anchorToml -match 'anchor_version = "0\.31\.1"') {
    Write-Host "✓ PASS: Anchor.toml version is 0.31.1" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: Anchor.toml version mismatch (should be 0.31.1)" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "📄 Documentation Checks" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Yellow

# Check for deployment docs
if (Test-Path "..\Docs\DEPLOYMENT_MAINNET.md") {
    Write-Host "✓ PASS: DEPLOYMENT_MAINNET.md exists" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: DEPLOYMENT_MAINNET.md missing" -ForegroundColor Red
    $failed++
}

# Check for security audit doc
if (Test-Path "..\Docs\SECURITY_AUDIT.md") {
    Write-Host "✓ PASS: SECURITY_AUDIT.md exists" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: SECURITY_AUDIT.md missing" -ForegroundColor Red
    $failed++
}

# Check for quick reference
if (Test-Path "..\Docs\QUICK_LAUNCH_REFERENCE.md") {
    Write-Host "✓ PASS: QUICK_LAUNCH_REFERENCE.md exists" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "✗ FAIL: QUICK_LAUNCH_REFERENCE.md missing" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "🎯 IDL Checks" -ForegroundColor Yellow
Write-Host "-------------" -ForegroundColor Yellow

# Check if IDL exists
if (Test-Path "target\idl\workspace.json") {
    Write-Host "✓ PASS: IDL generated (target\idl\workspace.json)" -ForegroundColor Green
    $passed++
    
    # Check IDL has instructions
    $idlContent = Get-Content "target\idl\workspace.json" -Raw
    $instructionCount = ($idlContent | Select-String -Pattern '"name":' -AllMatches).Matches.Count
    if ($instructionCount -gt 0) {
        Write-Host "✓ PASS: IDL contains $instructionCount named entries" -ForegroundColor Green
        $passed++
    }
}
else {
    Write-Host "✗ FAIL: IDL not generated" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "⚙️  Optional Checks" -ForegroundColor Yellow
Write-Host "------------------" -ForegroundColor Yellow

# Check for .env or configuration
if ((Test-Path ".env") -or (Test-Path ".env.local")) {
    Write-Host "ℹ INFO: Environment file found" -ForegroundColor Cyan
}
else {
    Write-Host "⚠ WARN: No .env file found (may need for deployment)" -ForegroundColor Yellow
}

# Check for git
if (Test-Command "git") {
    try {
        $commitCount = git rev-list --count HEAD 2>$null
        if ($commitCount -gt 0) {
            Write-Host "✓ INFO: Git repository with $commitCount commits" -ForegroundColor Green
        }
    }
    catch {
        # Git error, skip
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "VERIFICATION RESULTS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✓ Passed: $passed" -ForegroundColor Green
Write-Host "✗ Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🚀 READY FOR DEPLOYMENT" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review: ..\Docs\QUICK_LAUNCH_REFERENCE.md"
    Write-Host "2. Create mainnet keypair: solana-keygen new --outfile `"$env:USERPROFILE\mainnet-deployer.json`""
    Write-Host "3. Ensure 5+ SOL in account"
    Write-Host "4. Run: anchor deploy --provider.cluster mainnet-beta"
    Write-Host "5. Test on mainnet-beta with frontend"
    Write-Host "6. Deploy to production: anchor deploy --provider.cluster mainnet"
    Write-Host ""
    exit 0
}
else {
    Write-Host "❌ NOT READY FOR DEPLOYMENT" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the $failed failing check(s) before proceeding." -ForegroundColor Red
    Write-Host ""
    exit 1
}
