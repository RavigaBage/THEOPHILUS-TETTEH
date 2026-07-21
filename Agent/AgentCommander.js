 class AgentCommandHandler {

    constructor(socket, config) {
        this.socket = socket;
        this.config = config || {};
    }

    register() {

        this.socket.on("device:command", async (cmd) => {

            await this.socket.emit("command:ack", {
                commandId: cmd.commandId
            });

            try {

                const result =
                    await this.execute(cmd);

                this.socket.emit("command:complete", {
                    commandId: cmd.commandId,
                    success: true,
                    ...result
                });

            } catch (err) {

                this.socket.emit("command:failed", {
                    commandId: cmd.commandId,
                    error: err.message
                });
            }
        });
    }

    async execute(cmd) {
        const permissions = this.config.permissions || {};

        switch (cmd.type) {

            case "SYSTEM_RESTART":
                if (permissions.allowRemoteRestart === false) {
                    throw new Error("Permission Denied: Remote restart is disabled in local config.");
                }
                return this.restart();

            case "SYSTEM_SHUTDOWN":
                if (permissions.allowRemoteShutdown === false) {
                    throw new Error("Permission Denied: Remote shutdown is disabled in local config.");
                }
                return this.shutdown();

            case "SYSTEM_UPDATE":
                if (permissions.allowRemoteRestart === false) { // using allowRemoteRestart as fallback for updates
                    throw new Error("Permission Denied: Remote update is disabled in local config.");
                }
                return this.systemUpdate();

            case "PROCESS_START":
                return this.startProcess(cmd.payload);

            case "CMD_EXECUTE":
                return this.runCMD(cmd.payload);

            default:
                throw new Error("Unknown command: " + cmd.type);
        }
    }

    restart() {
        const platform = process.platform;
        const { exec } = require("child_process");
        if (platform === "win32") {
            exec("shutdown /r /t 0");
        } else if (platform === "darwin" || platform === "linux") {
            exec("shutdown -r now || reboot");
        } else {
            throw new Error(`Unsupported OS platform for restart: ${platform}`);
        }
        return { success: true };
    }

    shutdown() {
        const platform = process.platform;
        const { exec } = require("child_process");
        if (platform === "win32") {
            exec("shutdown /s /t 0");
        } else if (platform === "darwin" || platform === "linux") {
            exec("shutdown -h now || poweroff");
        } else {
            throw new Error(`Unsupported OS platform for shutdown: ${platform}`);
        }
        return { success: true };
    }

    systemUpdate() {
        const platform = process.platform;
        const { exec } = require("child_process");
        const path = require("path");

        return new Promise((resolve, reject) => {
            if (platform === "win32") {
                const ps1Path = path.join(__dirname, "scripts", "checks-and-install-updates.ps1");
                exec(`powershell -ExecutionPolicy Bypass -File "${ps1Path}"`, (error, stdout, stderr) => {
                    if (error) {
                        return reject(new Error(`PowerShell update failed: ${stderr || error.message}`));
                    }
                    try {
                        const res = JSON.parse(stdout.trim());
                        resolve(res);
                    } catch (e) {
                        resolve({ status: "installed", stdout: stdout.trim() });
                    }
                });
            } else if (platform === "linux") {
                exec("sudo apt-get update -y && sudo apt-get upgrade -y", (error, stdout, stderr) => {
                    if (error) {
                        exec("apt-get update -y", (err2, stdout2, stderr2) => {
                            if (err2) {
                                return reject(new Error(`Linux update failed: ${stderr2 || err2.message}`));
                            }
                            resolve({ status: "installed", stdout: stdout2.trim() });
                        });
                        return;
                    }
                    resolve({ status: "installed", stdout: stdout.trim() });
                });
            } else if (platform === "darwin") {
                exec("softwareupdate -ia", (error, stdout, stderr) => {
                    if (error) {
                        return reject(new Error(`macOS update failed: ${stderr || error.message}`));
                    }
                    resolve({ status: "installed", stdout: stdout.trim() });
                });
            } else {
                reject(new Error(`Unsupported OS platform for updates: ${platform}`));
            }
        });
    }

    runCMD(payload) {
        const { execSync } = require("child_process");
        const output = execSync(payload.command).toString();

        return {
            stdout: output
        };
    }

    startProcess(payload) {
        require("child_process")
            .spawn(payload.executable, [], {
                detached: true
            });

        return { success: true };
    }
}
module.exports = AgentCommandHandler;