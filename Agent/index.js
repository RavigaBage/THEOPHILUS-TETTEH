const { io } = require("socket.io-client");
const fs = require("fs");
const os = require("os");
const path = require("path");
const AgentCommandHandler = require("./AgentCommander");

const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "config.json"), "utf-8")
);

console.log("🚀 Starting Agent...");
console.log("📦 Config loaded:", config);

function getPrimaryIpAddress() {
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
        for (const entry of iface) {
            if (entry.family === "IPv4" && !entry.internal) return entry.address;
        }
    }
    return null;
}

function getPrimaryMacAddress() {
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
        for (const entry of iface) {
            if (entry.family === "IPv4" && !entry.internal) return entry.mac;
        }
    }
    return null;
}

function getOperatingSystem() {
    const platform = process.platform;
    const release  = os.release();
    const type     = os.type();

    if (platform === "win32")   return `Windows (${release})`;
    if (platform === "darwin")  return `macOS (${release})`;
    if (platform === "linux")   return `${type} (${release})`;
    return `${platform} (${release})`;
}

function buildRegistrationPayload() {
    return {
       
        deviceId:   config.deviceId,         
        socketId:   socket.id,

        
        deviceName:   config.deviceName   || os.hostname(),
        hostname:     os.hostname(),
        ipAddress:    getPrimaryIpAddress(),
        macAddress:   getPrimaryMacAddress(),
        platform:     getOperatingSystem(),  
        department:   config.department   || null,
        location:     config.location     || null,
        assignedUser: config.assignedUser || null,
        serialNumber: config.serialNumber || null,
        agentVersion: config.agentVersion || require("./package.json").version,

        remotePort:          config.remotePort          ?? 8080,
        authenticationMode:  config.authenticationMode  || "token",
        encryptionEnabled:   config.encryptionEnabled   ?? true,

        permissions: {
            allowRemoteShutdown:   config.permissions?.allowRemoteShutdown   ?? true,
            allowRemoteRestart:    config.permissions?.allowRemoteRestart     ?? true,
            allowRemoteLock:       config.permissions?.allowRemoteLock        ?? true,
            allowRemoteMonitoring: config.permissions?.allowRemoteMonitoring  ?? true,
            allowFileTransfer:     config.permissions?.allowFileTransfer      ?? false,
        },

        adminNotes: config.adminNotes || null,

        status: {
            networkValidation: "pending",
            remoteAgent:       "waiting",
            authentication:    "unverified",
        },

        security: {
            lastSeen:  new Date().toISOString(),
            ipHistory: getPrimaryIpAddress(),   // seed with current IP; server appends
            flagged:   false,
            riskLevel: "low",
        },
    };
}
// ── socket setup ──────────────────────────────────────────────────────────────

const socket = io(config.serverUrl, {
    reconnection: true,
    reconnectionDelay: config.reconnectInterval,
});

const handler = new AgentCommandHandler(socket, config);

socket.on("connect", () => {
    console.log("🟢 Connected to server:", socket.id);
    console.log("📡 Registering device:", config.deviceId);

    const payload = buildRegistrationPayload();
    socket.emit("agent:register", payload);

    console.log("✅ Device registered with payload:", payload);
});

socket.on("disconnect", () => {
    console.log("🔴 Disconnected from server");
});

socket.on("connect_error", (err) => {
    console.log("❌ Connection error:", err.message);
});

console.log("🧠 Registering command handler...");
handler.register();

console.log("🟡 Agent boot sequence complete...");