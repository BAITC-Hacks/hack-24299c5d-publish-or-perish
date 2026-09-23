$ErrorActionPreference = 'Stop'
$denoExecutable = Join-Path $PSScriptRoot '.tools\deno\deno.exe'
if (-not (Test-Path -LiteralPath $denoExecutable)) {
    $denoCommand = Get-Command deno -ErrorAction SilentlyContinue
    if ($denoCommand) { $denoExecutable = $denoCommand.Source }
    else { $denoExecutable = $null }
}
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
    if ($denoExecutable) {
        & $denoExecutable run --no-config --no-lock --no-prompt --allow-read=. --allow-net=127.0.0.1:8765,api.openai.com:443 serve-local.js
    } else {
        & node serve-node.mjs
    }
} finally { Pop-Location }
