# uninstall.ps1 - Windows elevated uninstaller for IAC Remote Management Agent
# Must be run as Administrator

$ErrorActionPreference = "Stop"

# Ensure script is running elevated
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator! Please open PowerShell as Administrator and try again."
    Exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Uninstalling IAC Remote Management Agent (Windows)       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$taskName = "IAC-Agent"
$installDir = "C:\Program Files\IAC-Agent"

# 1. Stop and Unregister Scheduled Task
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Write-Host "Stopping and removing scheduled task: $taskName..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Scheduled task unregistered successfully." -ForegroundColor Green
} else {
    Write-Host "No scheduled task found for $taskName." -ForegroundColor Yellow
}

# 2. Delete Installed Files
if (Test-Path $installDir) {
    Write-Host "Removing installed files from: $installDir..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $installDir -Recurse -Force
        Write-Host "Files removed successfully." -ForegroundColor Green
    } catch {
        Write-Warning "Could not remove some files in $installDir. They may be locked. They will be removed on next reboot."
    }
} else {
    Write-Host "Installation directory not found." -ForegroundColor Yellow
}

Write-Host "`n🟢 Uninstallation Complete!" -ForegroundColor Green
