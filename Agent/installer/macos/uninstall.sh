#!/usr/bin/env bash
# uninstall.sh - macOS elevated uninstaller for IAC Remote Management Agent
# Must be run as root/sudo

set -e

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run as root or with sudo! Please try again with: sudo ./uninstall.sh" >&2
  exit 1
fi

echo "=========================================================="
echo " Uninstalling IAC Remote Management Agent (macOS)         "
echo "=========================================================="

INSTALL_DIR="/Library/Application Support/IAC-Agent"
PLIST_FILE="/Library/LaunchDaemons/com.iac.agent.plist"

# 1. Unload and Delete launchd Plist
if [ -f "$PLIST_FILE" ]; then
  echo "Unloading and removing launchd daemon..."
  launchctl unload -w "$PLIST_FILE" || true
  rm -f "$PLIST_FILE"
  echo "Daemon plist removed."
else
  echo "No launchd daemon plist found at $PLIST_FILE."
fi

# 2. Delete Installed Files
if [ -d "$INSTALL_DIR" ]; then
  echo "Removing installed files from $INSTALL_DIR..."
  rm -rf "$INSTALL_DIR"
  echo "Files removed."
else
  echo "Installation directory $INSTALL_DIR not found."
fi

# 3. Clean Log Files
echo "Cleaning up daemon log files..."
rm -f /var/log/iac-agent.log /var/log/iac-agent.err

echo ""
echo "🟢 Uninstallation Complete!"
