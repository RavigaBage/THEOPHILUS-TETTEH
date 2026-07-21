#!/usr/bin/env bash
# uninstall.sh - Linux elevated uninstaller for IAC Remote Management Agent
# Must be run as root/sudo

set -e

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run as root or with sudo! Please try again with: sudo ./uninstall.sh" >&2
  exit 1
fi

echo "=========================================================="
echo " Uninstalling IAC Remote Management Agent (Linux)         "
echo "=========================================================="

INSTALL_DIR="/opt/iac-agent"
SERVICE_FILE="/etc/systemd/system/iac-agent.service"

# 1. Stop and Disable Service
if [ -f "$SERVICE_FILE" ]; then
  echo "Stopping and disabling iac-agent service..."
  systemctl stop iac-agent.service || true
  systemctl disable iac-agent.service || true
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload
  echo "Service file removed."
else
  echo "No systemd service file found at $SERVICE_FILE."
fi

# 2. Delete Installed Files
if [ -d "$INSTALL_DIR" ]; then
  echo "Removing installed files from $INSTALL_DIR..."
  rm -rf "$INSTALL_DIR"
  echo "Files removed."
else
  echo "Installation directory $INSTALL_DIR not found."
fi

echo ""
echo "🟢 Uninstallation Complete!"
