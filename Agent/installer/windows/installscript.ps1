#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installer for the IAC Remote Management Agent (Windows).

.DESCRIPTION
    Installs the agent to C:\Program Files\IAC-Agent, installs its npm
    dependencies (including node-windows), and registers it as a real,
    visible Windows Service named "IAC-RMM-Agent" running under
    NT AUTHORITY\SYSTEM. The service is visible in services.msc,
    Task Manager, and Get-Service — it is not hidden.

.NOTES
    Must be run from an elevated PowerShell session.
    Log file is written to C:\Program Files\IAC-Agent\logs\install.log
#>

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 0. Setup — paths, logging
# ---------------------------------------------------------------------------

$installDir = "C:\Program Files\IAC-Agent"
$logDir     = Join-Path $installDir "logs"
$logFile    = Join-Path $logDir "install.log"
$serviceName = "IAC-RMM-Agent"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Write-Host $line
    # Log dir may not exist yet on first run; create it defensively.
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    }
    Add-Content -Path $logFile -Value $line
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Installing IAC Remote Management Agent (Windows)         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Double-check elevation even though #Requires should enforce it
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator! Please open PowerShell as Administrator and try again."
    Exit 1
}

# ---------------------------------------------------------------------------
# 1. Check for Node.js
# ---------------------------------------------------------------------------

Write-Log "Checking for Node.js installation..."
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodePath = $nodeCmd.Source
} else {
    $fallback = "C:\Program Files\nodejs\node.exe"
    if (Test-Path $fallback) {
        $nodePath = $fallback
    } else {
        Write-Log "Node.js was not found on this system." "ERROR"
        Write-Error "Node.js was not found on this system. Please install Node.js (LTS version) and try again."
        Exit 1
    }
}
Write-Log "Found Node.js at: $nodePath"

# ---------------------------------------------------------------------------
# 2. Resolve source directory (folder containing this script's package,
#    i.e. two levels up from this script, matching the repo's script/ subfolder)
# ---------------------------------------------------------------------------

$sourceDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Write-Log "Resolved source directory: $sourceDir"

if (-not (Test-Path (Join-Path $sourceDir "index.js"))) {
    Write-Log "index.js not found under $sourceDir - check that PSScriptRoot is correct for your repo layout." "ERROR"
    Write-Error "Could not find index.js under $sourceDir. Verify the script's location relative to the agent source."
    Exit 1
}

# ---------------------------------------------------------------------------
# 3. Stop and remove any existing installation (idempotent re-install)
# ---------------------------------------------------------------------------

Write-Log "Preparing installation directory: $installDir"

$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Log "Existing service found. Stopping and removing it before reinstall..."
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    if (Test-Path (Join-Path $installDir "service-wrapper.js")) {
        Push-Location $installDir
        & $nodePath "service-wrapper.js" "uninstall"
        Pop-Location
        Start-Sleep -Seconds 2
    }
}

if (Test-Path $installDir) {
    # Preserve logs across reinstall rather than deleting them
    $preserveLogs = Join-Path $env:TEMP "iac-agent-logs-backup"
    if (Test-Path $logDir) {
        Copy-Item -Path $logDir -Destination $preserveLogs -Recurse -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
    if (Test-Path $preserveLogs) {
        Copy-Item -Path $preserveLogs -Destination $logDir -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $preserveLogs -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

# ---------------------------------------------------------------------------
# 4. Copy agent files
# ---------------------------------------------------------------------------

Write-Log "Copying files from $sourceDir to $installDir..."
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $installDir -Recurse -Force -Exclude "node_modules"

# Copy the service wrapper alongside the agent code
Copy-Item -Path (Join-Path $PSScriptRoot "service-wrapper.js") -Destination $installDir -Force

# ---------------------------------------------------------------------------
# 5. Install dependencies (including node-windows for service registration)
# ---------------------------------------------------------------------------

Write-Log "Installing NPM production dependencies..."
Push-Location $installDir
try {
    & npm install --production
    Write-Log "NPM dependencies installed successfully."
} catch {
    Write-Log "NPM install encountered an issue: $_" "ERROR"
    Pop-Location
    Exit 1
}

Write-Log "Installing node-windows (service wrapper dependency)..."
try {
    & npm install node-windows
    Write-Log "node-windows installed successfully."
} catch {
    Write-Log "Failed to install node-windows: $_" "ERROR"
    Pop-Location
    Exit 1
}
Pop-Location

# ---------------------------------------------------------------------------
# 6. Register the Windows Service (visible, named, runs as SYSTEM)
# ---------------------------------------------------------------------------

Write-Log "Registering Windows Service '$serviceName' via node-windows..."
Push-Location $installDir
try {
    & $nodePath "service-wrapper.js" "install"
} catch {
    Write-Log "Service registration failed: $_" "ERROR"
    Pop-Location
    Exit 1
}
Pop-Location

# Give the SCM a moment to register the service before querying it
Start-Sleep -Seconds 3

# ---------------------------------------------------------------------------
# 7. Verify status
# ---------------------------------------------------------------------------

$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Log "Installation successful. Service '$serviceName' is running."
    Write-Host "`n[OK] Installation Successful!" -ForegroundColor Green
    Write-Host "Service name: $serviceName" -ForegroundColor Green
    Write-Host "View it any time with: Get-Service $serviceName" -ForegroundColor Green
    Write-Host "Or in services.msc / Task Manager > Services tab." -ForegroundColor Green
    Write-Host "Logs: $logFile" -ForegroundColor Green
} elseif ($svc) {
    Write-Log "Service registered but current status is: $($svc.Status)" "WARN"
    Write-Warning "Service '$serviceName' is registered but in state: $($svc.Status). Check $logFile and Windows Event Viewer > Application log."
} else {
    Write-Log "Service registration did not complete - Get-Service found nothing." "ERROR"
    Write-Error "Installation failed: service '$serviceName' was not found after install. See $logFile for details."
    Exit 1
}

Write-Host "`nTo uninstall, run: .\uninstall.ps1" -ForegroundColor Cyan