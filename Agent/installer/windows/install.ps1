# install.ps1 - Windows elevated installer for IAC Remote Management Agent
# Must be run as Administrator

$ErrorActionPreference = "Stop"

# Ensure script is running elevated
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator! Please open PowerShell as Administrator and try again."
    Exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Installing IAC Remote Management Agent (Windows)         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check for Node.js
Write-Host "Checking for Node.js installation..." -ForegroundColor Yellow
$nodePath = Where-Object { Test-Path $_ } (Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
if (-not $nodePath) {
    # Check default path
    $nodePath = "C:\Program Files\nodejs\node.exe"
    if (-not (Test-Path $nodePath)) {
        Write-Error "Node.js was not found on this system. Please install Node.js (LTS version) and try again."
        Exit 1
    }
}
Write-Host "Found Node.js at: $nodePath" -ForegroundColor Green

# 2. Define Installation Paths
$installDir = "C:\Program Files\IAC-Agent"
$sourceDir = Resolve-Path "$PSScriptRoot\..\.." | Select-Object -ExpandProperty Path
$agentSourceDir = Join-Path $sourceDir "Agent"

Write-Host "Preparing installation directory: $installDir" -ForegroundColor Yellow
if (Test-Path $installDir) {
    Write-Host "Existing installation directory found. Stopping any current tasks..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName "IAC-Agent" -Confirm:$false -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $installDir | Out-Null

# 3. Copy Agent Files
Write-Host "Copying files from $agentSourceDir to $installDir..." -ForegroundColor Yellow
Copy-Item -Path "$agentSourceDir\*" -Destination $installDir -Recurse -Force

# 4. Install Dependencies
Write-Host "Installing NPM production dependencies..." -ForegroundColor Yellow
Push-Location $installDir
try {
    & npm install --production
    Write-Host "NPM dependencies installed successfully." -ForegroundColor Green
} catch {
    Write-Warning "NPM install encountered an issue: $_. Proceeding anyway if node_modules exists..."
}
Pop-Location

# 5. Create Scheduled Task for Boot Execution (Runs as SYSTEM, completely hidden, independent of logins)
Write-Host "Registering native Windows Scheduled Task..." -ForegroundColor Yellow

$taskName = "IAC-Agent"
$taskDescription = "IAC Remote Management Agent - Runs background remote execution commands"

# Trigger at Startup/Boot
$trigger = New-ScheduledTaskTrigger -AtStartup

# Action: Execute Node hiddenly
# To make it truly invisible and run as a service, we target cmd.exe to start node in a background process
$nodeRelativePath = "node.exe"
$action = New-ScheduledTaskAction -Execute $nodePath -Argument "index.js" -WorkingDirectory $installDir

# Settings: Auto-restart on failure, allow on batteries, infinite execution time limit
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$settings.ExecutionTimeLimit = "PT0S" # Unlimited
$settings.RestartCount = 999
$settings.RestartInterval = "PT1M" # 1 minute

# Principal: SYSTEM (Highest privilege for Shutdown/Restart/Updates)
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register Task
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings -Principal $principal -Description $taskDescription -Force | Out-Null

# 6. Start the Agent Service Task
Write-Host "Starting the IAC-Agent service task..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "IAC-Agent"

# Verify status
$task = Get-ScheduledTask -TaskName "IAC-Agent"
if ($task.State -eq "Running" -or $task.State -eq "Ready") {
    Write-Host "`n🟢 Installation Successful!" -ForegroundColor Green
    Write-Host "IAC Agent is running as a background service under NT AUTHORITY\SYSTEM." -ForegroundColor Green
    Write-Host "The agent will start automatically on boot and restart if crashed." -ForegroundColor Green
} else {
    Write-Warning "Task is registered but in state: $($task.State). Please check the Event Viewer."
}
