# Run from repo root to install, clean, and start dev server (PowerShell)

Write-Host "1) Install dependencies"
npm install

Write-Host "2) Run cleanup to untrack artifacts"
pwsh ./scripts/cleanup-git.ps1

Write-Host "3) Start dev server"
npm run dev

Write-Host "If you need to build for production: npm run build"