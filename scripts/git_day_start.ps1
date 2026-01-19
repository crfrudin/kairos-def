# scripts\git_day_start.ps1
$ErrorActionPreference = "Stop"

git rev-parse --show-toplevel | Out-Null

Write-Host "Repo:" (git rev-parse --show-toplevel)
Write-Host "Branch:" (git branch --show-current)

git pull

$st = git status --porcelain
if ($st) {
  Write-Host ""
  Write-Host "ERRO: Working tree nao esta clean. Resolva antes de continuar." -ForegroundColor Red
  Write-Host $st
  exit 1
}

Write-Host ""
Write-Host "OK: nothing to commit, working tree clean." -ForegroundColor Green
