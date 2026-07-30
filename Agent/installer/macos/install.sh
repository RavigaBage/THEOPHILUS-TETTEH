#!/usr/bin/env bash
# install.sh - macOS elevated installer for IAC Remote Management Agent
# Must be run as root/sudo

set -e

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run as root or with sudo! Please try again with: sudo ./install.sh" >&2
  exit 1
fi

echo "=========================================================="
echo " Installing IAC Remote Management Agent (macOS)           "
echo "=========================================================="

# 1. Check for Node.js
echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
  # Try common brew path as well
  if [ -f "/opt/homebrew/bin/node" ]; then
    NODE_PATH="/opt/homebrew/bin/node"
  elif [ -f "/usr/local/bin/node" ]; then
    NODE_PATH="/usr/local/bin/node"
  else
    echo "❌ Node.js is not installed on this system. Please install Node.js and try again." >&2
    exit 1
  fi
else
  NODE_PATH=$(command -v node)
fi
echo "Found Node.js at: $NODE_PATH"

# 2. Define Paths
INSTALL_DIR="/Library/Application Support/IAC-Agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_SRC_DIR="$SCRIPT_DIR/../.."

echo "Preparing installation directory: $INSTALL_DIR"
if [ -d "$INSTALL_DIR" ]; then
  echo "Existing installation directory found. Unloading running daemon..."
  launchctl unload -w /Library/LaunchDaemons/com.iac.agent.plist 2>/dev/null || true
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

# 5. Create launchd Plist file
PLIST_FILE="/Library/LaunchDaemons/com.iac.agent.plist"
echo "Creating launchd daemon plist: $PLIST_FILE..."

cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.iac.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$INSTALL_DIR/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>StandardOutPath</key>
    <string>/var/log/iac-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/iac-agent.err</string>
</dict>
</plist>
EOF

# Set permissions for the plist (must be root:wheel, 644)
chown root:wheel "$PLIST_FILE"
chmod 644 "$PLIST_FILE"

# 6. Load launchd daemon
echo "Loading daemon into launchd..."
launchctl load -w "$PLIST_FILE"

echo ""
echo "🟢 Installation Successful!"
echo "IAC Agent is running as a macOS launchd daemon under user 'root'."
echo "The agent will start automatically on boot, run silently, and restart if crashed."
