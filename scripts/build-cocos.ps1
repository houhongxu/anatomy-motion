# 官方编辑器构建 / Build with the official editor.
param([Parameter(Mandatory=$true)][string]$Editor)
$ErrorActionPreference = 'Stop'
$project = Join-Path (Split-Path $PSScriptRoot -Parent) 'creator'
if (-not (Test-Path -LiteralPath $Editor)) { throw '找不到编辑器 / Editor not found' }
$logRoot = Join-Path $env:TEMP ('anatomy-motion-build-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $logRoot | Out-Null
$process = Start-Process -FilePath $Editor -ArgumentList @('--project',('"' + $project + '"'),'--build','"platform=web-desktop;debug=true"') -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $logRoot 'build.log') -RedirectStandardError (Join-Path $logRoot 'error.log')
if ($process.ExitCode -ne 36) {
  Get-Content -LiteralPath (Join-Path $logRoot 'error.log') -Tail 25
  throw "Cocos build failed: $($process.ExitCode). Logs: $logRoot"
}
Write-Output "构建完成 / Build complete: $project\build\web-desktop"
Write-Output "日志 / Logs: $logRoot"
