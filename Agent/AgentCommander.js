class AgentCommandHandler {

    constructor(socket, config) {
        this.socket = socket;
        this.config = config || {};
    }

    register() {

        this.socket.on("device:command", async (cmd) => {

            this.socket.emit("command:ack", {
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
                if (permissions.allowRemoteUpdate === false) {
                    throw new Error("Permission Denied: Remote update is disabled in local config.");
                }
                return this.systemUpdate();

            case "PROCESS_START":
                if (permissions.allowProcessStart !== true) {
                    throw new Error("Permission Denied: Remote process start is disabled in local config.");
                }
                return this.startProcess(cmd.payload);

            case "CMD_EXECUTE":
                if (permissions.allowRemoteCommandExecution !== true) {
                    throw new Error("Permission Denied: Remote command execution is disabled in local config.");
                }
                return this.runCMD(cmd.payload);

            default:
                throw new Error("Unknown command: " + cmd.type);
        }
    }

    // ...restart(), shutdown(), systemUpdate() unchanged...

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