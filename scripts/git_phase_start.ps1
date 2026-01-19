# scripts\git_phase_start.ps1
param(
  [Parameter(Mandatory=$true)]
  [string]$PhaseName
)

$ErrorActionPreference = "Stop"

git rev-parse --show-toplevel | Out-Null

$st = git status --porcelain
if ($st) {
  Write-Host ""
  Write-Host "ERRO: Antes de iniciar uma fase, o repo deve estar clean." -ForegroundColor Red
  Write-Host $st
  exit 1
}

$branch = "phase/$PhaseName"

git checkout -b $branch
git push -u origin $branch

Write-Host ""
Write-Host "OK: Fase iniciada em $branch e enviada ao GitHub." -ForegroundColor Green
