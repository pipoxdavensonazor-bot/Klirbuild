#Requires -Version 5.1
<#
  Configure AWS CLI + fix Amplify WEB -> WEB_COMPUTE + set env vars + redeploy.
  Usage: double-click FIX-AMPLIFY.bat or: npm run amplify:fix

  Prerequisite (one-time): IAM user access key CSV in Downloads folder
  (filename like *accessKeys*.csv from AWS "Create access key").
#>
$ErrorActionPreference = "Stop"

$AppId = "d2inlatygxuxmp"
$Branch = "staging"
$Region = "us-east-1"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvLocal = Join-Path $ProjectRoot ".env.local"
$Downloads = Join-Path $env:USERPROFILE "Downloads"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Find-AccessKeyCsv {
  $patterns = @(
    (Join-Path $Downloads "*accessKeys*.csv"),
    (Join-Path $Downloads "*Access key*.csv"),
    (Join-Path $ProjectRoot "*accessKeys*.csv")
  )
  foreach ($pattern in $patterns) {
    $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

function Import-EnvLocal([string]$Path) {
  $vars = @{}
  if (-not (Test-Path $Path)) { return $vars }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"')
    if ($key) { $vars[$key] = $val }
  }
  return $vars
}

function Ensure-BetterAuthSecret([hashtable]$Vars) {
  if ($Vars["BETTER_AUTH_SECRET"] -and $Vars["BETTER_AUTH_SECRET"].Length -ge 32) {
    return $Vars["BETTER_AUTH_SECRET"]
  }
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

Write-Step "Verification AWS CLI"
$aws = Get-Command aws -ErrorAction SilentlyContinue
if (-not $aws) {
  $awsExe = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
  if (-not (Test-Path $awsExe)) {
    Write-Host "AWS CLI introuvable. Installez avec: winget install Amazon.AWSCLI" -ForegroundColor Red
    exit 1
  }
  $aws = $awsExe
} else {
  $aws = $aws.Source
}

& $aws --version

Write-Step "Configuration des identifiants AWS"
$identityOk = $false
try {
  $null = & $aws sts get-caller-identity --region $Region 2>$null
  if ($LASTEXITCODE -eq 0) { $identityOk = $true }
} catch {}

if (-not $identityOk) {
  $csv = Find-AccessKeyCsv
  if (-not $csv) {
    Write-Host @"

Aucune cle d'acces valide et aucun fichier CSV trouve.

ACTION UNIQUE REQUISE (2 minutes):
1. Console AWS -> IAM -> Users -> klirline-Build
2. Security credentials -> Create access key -> CLI
3. Telechargez le fichier .csv
4. Laissez-le dans: $Downloads
5. Relancez FIX-AMPLIFY.bat

"@ -ForegroundColor Yellow
    exit 1
  }

  Write-Host "Fichier CSV detecte: $csv" -ForegroundColor Green
  $rows = Import-Csv -Path $csv
  $row = $rows | Select-Object -First 1
  $accessKey = $row.'Access key ID'
  $secretKey = $row.'Secret access key'
  if (-not $accessKey -or -not $secretKey) {
    Write-Host "CSV invalide (colonnes Access key ID / Secret access key manquantes)." -ForegroundColor Red
    exit 1
  }

  & $aws configure set aws_access_key_id $accessKey
  & $aws configure set aws_secret_access_key $secretKey
  & $aws configure set region $Region
  & $aws configure set output json
}

$identity = & $aws sts get-caller-identity --region $Region | ConvertFrom-Json
Write-Host "Connecte en tant que compte $($identity.Account) (user $($identity.Arn))" -ForegroundColor Green

Write-Step "Passage Amplify en WEB_COMPUTE (Next.js SSR)"
& $aws amplify update-app --app-id $AppId --platform WEB_COMPUTE --region $Region
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $aws amplify update-branch `
  --app-id $AppId `
  --branch-name $Branch `
  --framework "Next.js - SSR" `
  --region $Region
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Variables d'environnement Amplify"
$local = Import-EnvLocal $EnvLocal
$appUrl = "https://staging.$AppId.amplifyapp.com"
$envMap = [ordered]@{
  DEMO_AUTH_BYPASS = "false"
  NEXT_PUBLIC_APP_URL = $appUrl
  BETTER_AUTH_SECRET = (Ensure-BetterAuthSecret $local)
  BETTER_AUTH_URL = $appUrl
}

$copyKeys = @(
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_BUSINESS_MONTHLY",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_GROWTH_YEARLY",
  "STRIPE_PRICE_BUSINESS_YEARLY",
  "DATABASE_URL"
)

foreach ($key in $copyKeys) {
  if ($local[$key]) { $envMap[$key] = $local[$key] }
}

$pairs = @()
foreach ($entry in $envMap.GetEnumerator()) {
  if ($entry.Value) {
    $pairs += "$($entry.Key)=$($entry.Value)"
  }
}

if ($pairs.Count -gt 0) {
  & $aws amplify update-app --app-id $AppId --environment-variables $pairs --region $Region
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Step "Redeploiement branche $Branch"
$job = & $aws amplify start-job `
  --app-id $AppId `
  --branch-name $Branch `
  --job-type RELEASE `
  --region $Region | ConvertFrom-Json

Write-Host "Job ID: $($job.jobSummary.jobId)" -ForegroundColor Green
Write-Host ""
Write-Host "Termine. Attendez 5-10 min puis testez:" -ForegroundColor Green
Write-Host "  $appUrl/api/health"
Write-Host "  $appUrl/login"
Write-Host ""
Write-Host "Console Amplify:" -ForegroundColor Gray
Write-Host "  https://us-east-1.console.aws.amazon.com/amplify/apps/$AppId/overview"
