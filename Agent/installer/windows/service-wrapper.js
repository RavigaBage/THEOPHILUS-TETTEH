// service-wrapper.js
// Defines and installs the IAC Remote Management Agent as a real, visible Windows Service
// using node-windows. This is invoked by install.ps1 — do not run manually unless you
// know what you're doing.

const path = require('path');
const { Service } = require('node-windows');

// Path to the actual agent entrypoint (index.js), assumed to live alongside this file
// once copied into the install directory.
const scriptPath = path.join(__dirname, 'index.js');

const svc = new Service({
  name: 'IAC-RMM-Agent',
  description: 'IAC Remote Management Agent — provides authorized remote administration ' +
                '(monitoring, updates, scheduled maintenance) for this machine. ' +
                'Contact your IT administrator with questions.',
  script: scriptPath,
  nodeOptions: [],
  // Run under LocalSystem since the agent needs to manage services/updates.
  // If your agent does NOT need SYSTEM-level access, switch to a dedicated
  // service account instead — see README notes at the bottom of install.ps1.
  workingDirectory: path.join(__dirname),
  allowServiceLogon: true,
});

// Log path for install/start/error events (separate from the agent's own app logs)
const logDir = path.join(__dirname, 'logs');
require('fs').mkdirSync(logDir, { recursive: true });
const fs = require('fs');
const logFile = path.join(logDir, 'service-install.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg);
}

svc.on('install', () => {
  log('Service installed successfully.');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  log('Service was already installed. Starting it.');
  svc.start();
});

svc.on('start', () => {
  log('Service started successfully.');
});

svc.on('error', (err) => {
  log(`Service error: ${err}`);
  process.exitCode = 1;
});

svc.on('invalidinstallation', () => {
  log('Invalid installation detected. Please uninstall and try again.');
  process.exitCode = 1;
});

const action = process.argv[2];

if (action === 'uninstall') {
  svc.on('uninstall', () => {
    log('Service uninstalled successfully.');
  });
  svc.uninstall();
} else {
  log('Installing IAC-RMM-Agent as a Windows Service...');
  svc.install();
}