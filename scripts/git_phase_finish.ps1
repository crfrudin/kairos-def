# scripts\git_phase_finish.ps1
param(
  [Parameter(Mandatory=$true)]
  [string]$PhaseName,

  [Parameter(Mandatory=$true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"

git rev-parse --show-toplevel | Out-Null

$phaseBranch = "phase/$PhaseName"

# garantir que estamos na branch da fase
$cur = git branch --show-current
if ($cur -ne $phaseBranch) {
  Write-Host ""
  Write-Host "ERRO: Voce nao esta na branch $phaseBranch. Branch atual: $cur" -ForegroundColor Red
  exit 1
}

git add -A
git commit -m $Message
git push

git checkout main
git pull origin main
git merge --no-ff $phaseBranch
git push origin main

$st = git status --porcelain
if ($st) {
  Write-Host ""
  Write-Host "ATENCAO: main nao ficou clean (verifique abaixo):" -ForegroundColor Yellow
  Write-Host $st
  exit 1
}

Write-Host ""
Write-Host "OK: Fase finalizada, mergeada na main e enviada ao GitHub. Repo clean." -ForegroundColor Green
