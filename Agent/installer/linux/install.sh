#!/usr/bin/env bash
# install.sh - Linux elevated installer for IAC Remote Management Agent
# Must be run as root/sudo

set -e

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run as root or with sudo! Please try again with: sudo ./install.sh" >&2
  exit 1
fi

echo "=========================================================="
echo " Installing IAC Remote Management Agent (Linux)           "
echo "=========================================================="

# 1. Check for Node.js
echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed on this system. Please install Node.js (LTS version) and try again." >&2
  exit 1
fi
NODE_PATH=$(command -v node)
echo "Found Node.js at: $NODE_PATH"

# 2. Define Paths
INSTALL_DIR="/opt/iac-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_SRC_DIR="$SCRIPT_DIR/../.."

echo "Preparing installation directory: $INSTALL_DIR"
if [ -d "$INSTALL_DIR" ]; then
  echo "Existing installation directory found. Stopping running service..."
  systemctl stop iac-agent.service 2>/dev/null || true
  rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"

# 3. Copy Agent Files
echo "Copying agent files to $INSTALL_DIR..."
cp -r "$AGENT_SRC_DIR/Agent/"* "$INSTALL_DIR/"

# 4. Install Dependencies
echo "Installing NPM production dependencies..."
cd "$INSTALL_DIR"
if ! npm install --production; then
  echo "⚠️  NPM install completed with warnings/errors. Proceeding..."
fi

# 5. Create systemd Service Unit
SERVICE_FILE="/etc/systemd/system/iac-agent.service"
echo "Creating systemd service: $SERVICE_FILE..."

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=IAC Remote Management Agent
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_PATH index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iac-agent

[Install]
WantedBy=multi-user.target
EOF

# 6. Enable and Start Service
echo "Reloading systemd, enabling, and starting the iac-agent service..."
systemctl daemon-reload
systemctl enable iac-agent.service
systemctl start iac-agent.service

# Verify
if systemctl is-active --quiet iac-agent.service; then
  echo ""
  echo "🟢 Installation Successful!"
  echo "IAC Agent is running as a systemd background service under user 'root'."
  echo "The agent will start automatically on boot and restart if crashed."
else
  echo "⚠️  Service was registered but failed to start. Run 'journalctl -u iac-agent.service' for logs."
fi
