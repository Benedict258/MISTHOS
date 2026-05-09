<#
Run this from the repository root in PowerShell to stop tracking generated artifacts
and commit the .gitignore changes. This does NOT rewrite history. If you need to
remove files from history (huge repo), use BFG or git filter-repo after confirming.

Usage:
  pwsh ./scripts/cleanup-git.ps1
#>

Write-Host "Removing tracked build artifacts and node_modules from git index..."

$paths = @(
  'node_modules',
  'dist',
  'build',
  'target',
  'contracts/target',
  '.env',
  '.env.local',
  'contracts/target/deploy',
  'contracts/target/debug',
  'coverage',
  '.DS_Store'
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        git rm -r --cached --ignore-unmatch $p | Out-Null
        Write-Host "Untracked: $p"
    } else {
        Write-Host "Not present: $p"
    }
}

Write-Host "Staging .gitignore and commit changes"
git add .gitignore
git commit -m "chore: remove tracked artifacts and ignore generated files" || Write-Host "Nothing to commit"

Write-Host "To rewrite history and purge large files, consider using the BFG or git filter-repo tools."
Write-Host "Example BFG usage (careful — this rewrites history): bfg --delete-folders node_modules --delete-files '*.log'"
Write-Host "If you want me to run a history rewrite, confirm and I'll provide exact commands and precautions."
