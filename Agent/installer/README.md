# IAC Remote Management Agent Service Installer Suite

This directory contains native installer and uninstaller scripts to deploy the IAC Remote Management Agent as an elevated background daemon/service on Windows, Linux, and macOS platforms.

---

## Key Service Architecture
1. **Boot Execution**: Configured to run automatically at system boot time, independent of any active user sessions or logins.
2. **Invisible Operation**: Operates strictly in the background without any console windows, terminal screens, or dock/taskbar icons.
3. **Elevated Privileges**: Registers and runs under highest administrative contexts (`NT AUTHORITY\SYSTEM` on Windows, `root` on Linux/macOS) to successfully execute OS commands such as `shutdown`, `reboot`, and system upgrades.
4. **Resiliency**: Monitors the process continuously and triggers automatic restarts in the event of crashes or unexpected termination.
5. **Auto-Reconnection**: Reconnects and registers itself back to the central server utilizing the standard WebSockets handshake protocols.

---

## 💻 Windows (PowerShell Installer)

### Installation
1. Open **PowerShell** as **Administrator**.
2. Navigate to the `Agent/installer/windows` directory.
3. Execute the installer:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\install.ps1
   ```

### Verification
- Check status in PowerShell:
  ```powershell
  Get-ScheduledTask -TaskName "IAC-Agent"
  ```
- Or check the Running state inside the standard Windows **Task Scheduler** under the root folder `Task Scheduler Library`.
- Verify the process runs hidden under user `SYSTEM` in the Details tab of the **Task Manager** (`node.exe` with working directory `C:\Program Files\IAC-Agent`).

### Uninstallation
1. Open **PowerShell** as **Administrator**.
2. Run:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\uninstall.ps1
   ```

---

## 🐧 Linux (systemd Installer)

### Installation
1. Open a terminal window.
2. Run the installer script with root permissions:
   ```bash
   sudo ./linux/install.sh
   ```

### Verification
- View service runtime status and active daemon state:
  ```bash
  sudo systemctl status iac-agent.service
  ```
- Follow log entries using journalctl:
  ```bash
  sudo journalctl -u iac-agent.service -f
  ```

### Uninstallation
1. Run:
   ```bash
   sudo ./linux/uninstall.sh
   ```

---

## 🍏 macOS (launchd Daemon)

### Installation
1. Open a terminal window.
2. Run the installer script with root permissions:
   ```bash
   sudo ./macos/install.sh
   ```

### Verification
- View active status of the launchd daemon:
  ```bash
  sudo launchctl list | grep com.iac.agent
  ```
- Tail logs produced by the background agent:
  ```bash
  tail -f /var/log/iac-agent.log
  tail -f /var/log/iac-agent.err
  ```

### Uninstallation
1. Run:
   ```bash
   sudo ./macos/uninstall.sh
   ```

---

## ⚙️ Configuration & Provisioning
Before running any installer, make sure to update `/Agent/config.json` with your target server properties:
- `serverUrl`: Target URL of the IAC backend server (e.g., `https://ais-dev-...run.app`).
- `deviceId`: Unique ID assigned to this lab PC.
- `permissions`: Allow/disallow specific remote capability vectors locally (fails-closed if omitted or disabled).
