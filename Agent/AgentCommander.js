 class AgentCommandHandler {

    constructor(socket) {
        this.socket = socket;
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

        switch (cmd.type) {

            case "SYSTEM_RESTART":
                return this.restart();

            case "SYSTEM_SHUTDOWN":
                return this.shutdown();

            case "PROCESS_START":
                return this.startProcess(cmd.payload);

            case "CMD_EXECUTE":
                return this.runCMD(cmd.payload);

            default:
                throw new Error("Unknown command");
        }
    }

    restart() {
        require("child_process")
            .exec("shutdown /r /t 0");

        return { success: true };
    }

    shutdown() {
        require("child_process")
            .exec("shutdown /s /t 0");

        return { success: true };
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