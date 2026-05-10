<#
One-click fixer for Windows: forcibly stop node, remove locked node_modules,
install yarn, clear npm cache, and retry npm install. Run PowerShell as
Administrator and from the repository root.

Usage (Admin PowerShell):
  > .\scripts\fix-install.ps1

#>
param()

function Abort($msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

# Ensure running as admin
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Abort "Please re-run this script from an elevated (Administrator) PowerShell."
}

Write-Host "Stopping node processes (if any)..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Attempting robust node_modules deletion via robocopy mirror trick..." -ForegroundColor Yellow
try {
    New-Item -ItemType Directory -Path .\empty_dir -Force | Out-Null
    robocopy .\empty_dir .\node_modules /MIR | Out-Null
    Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .\empty_dir -ErrorAction SilentlyContinue
} catch {
    Write-Host "robocopy trick failed, attempting direct Remove-Item..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
}

Write-Host "Removing package-lock.json (if present)..." -ForegroundColor Yellow
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue

Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force
npm cache verify | Out-Null

Write-Host "Installing yarn globally (some packages expect yarn in postinstall)..." -ForegroundColor Yellow
try {
    npm install -g yarn
} catch {
    Write-Host "Global yarn install failed; continuing (you can install yarn manually)." -ForegroundColor Yellow
}

Write-Host "Running npm install (legacy peer deps, no audit) ..." -ForegroundColor Yellow
$installCmd = 'npm install --legacy-peer-deps --no-audit --no-fund --progress=false'
try {
    iex $installCmd
} catch {
    Write-Host "npm install failed. If errors persist try: reboot, use WSL (recommended), or install Node 20 LTS via nvm-windows." -ForegroundColor Red
    exit 1
}

Write-Host "Done. If the install still fails, reboot and retry or consider running inside WSL/Ubuntu." -ForegroundColor Green
exit 0
