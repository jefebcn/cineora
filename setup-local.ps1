# Creazione sicura dei file di configurazione locali (PowerShell Windows).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root 'apps/api/.env'
$web = Join-Path $root 'apps/web/.env.local'

if (-not (Test-Path $api)) {
  $template = Get-Content (Join-Path $root '.env.example') -Raw
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  $secret = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
  $template = $template.Replace('REPLACE_WITH_LONG_RANDOM_SECRET', $secret)
  [System.IO.File]::WriteAllText($api, $template, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Creato apps/api/.env con ADMIN_SYNC_KEY casuale.'
} else {
  Write-Host 'apps/api/.env gia presente: invariato.'
}
if (-not (Test-Path $web)) {
  Copy-Item (Join-Path $root 'apps/web/.env.example') $web
  Write-Host 'Creato apps/web/.env.local (nessun segreto).'
} else {
  Write-Host 'apps/web/.env.local gia presente: invariato.'
}
Write-Host 'Ora inserisci il tuo TMDB_READ_ACCESS_TOKEN solo in apps/api/.env, poi esegui npm install e docker compose up -d.'
