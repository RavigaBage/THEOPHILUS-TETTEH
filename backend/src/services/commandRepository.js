class CommandRepository {

    constructor(db) {
        this.db = db;
    }


    async create({ commandType, payload, status = "PENDING" }) {
        try{
            const commands = await this.db.deviceCommand.create({
                commandType,
                payload,
                status
            });
            return {status:"sucess",commands:commands};
        }catch(error){
            return {status:"error",message:error};
        }
    }

 

    async createTargets(commandId, deviceIds) {
        try{
            const safeDeviceIds = Array.isArray(deviceIds)
            ? deviceIds
            : [deviceIds];
            const values = safeDeviceIds.map(deviceId => ({
                commandId,
                deviceId,
                status: "PENDING"
            }));
            console.log('VALUES :', deviceIds,values);
            const result = await this.db.deviceCommandTarget.insertMany(values);


            return result;
        }catch(error){
            console.error("Error creating command targets:", error);
            throw error;
        }

    }

    async getRoomId(target_id){
        const filter = await this.db.devices.findOne({
            _id: target_id
        });
        console.log('target_ids',target_id,'filter',filter);
        return filter;
    }


    async getCommand(commandId) {

        const filter = await this.db.deviceCommand.findById(commandId);

        return filter;
    }

  
    async getTargets(commandId) {
        try{
            const filter = await this.db.deviceCommandTarget.find({commandId:commandId});
            return filter;
        }catch(error){
            console.error("Error creating command targets:", error);
            throw error;
        }

    }


    async getQueuedCommands() {
        try{
            const filter = await this.db.deviceCommand.find({ status: "QUEUED" }).sort({ created_at: 1 });
            console.log(filter,'queued commands');
            return filter;
        }catch(error){
            console.error("Error fetching queued commands:", error);
            throw error;
        }

    }


    async updateStatus(commandId, status_) {
      try {
        const response = await this.db.deviceCommand.findByIdAndUpdate(
              commandId,
              { status: status_ },
              { new: true }
          );
        return response;
      } catch (error) {
        console.error("Error updating command status:", error);
        throw error;
      }
    }

    async markSent(targetId) {
        return await this.db.deviceCommandTarget.findByIdAndUpdate(
            targetId,
            { status: 'SENT' },
            { new: true }
        );
    }

    async markAcknowledged(targetId) {
        return await this.db.deviceCommandTarget.findByIdAndUpdate(
            targetId,
            {
                $set: {
                    status: "ACKNOWLEDGED",
                    acknowledgedAt: new Date()
                }
            },
            { new: true }
        );
    }

    async markCompleted(targetId) {
        return await this.db.deviceCommandTarget.findByIdAndUpdate(
            targetId,
            {
                $set: {
                    status: "COMPLETED",
                    completedAt: new Date()
                }
            },
            { new: true }
        );
    }

    async markFailed(targetId, errorMessage) {
        return await this.db.deviceCommandTarget.findByIdAndUpdate(
            targetId,
            {
                $set: {
                    status: "FAILED",
                    errorMessage
                }
            },
            { new: true }
        );
    }

    async markOffline(targetId, errorMessage) {
        return await this.db.deviceCommandTarget.findByIdAndUpdate(
            targetId,
            {
                $set: {
                    status: "FAILED",
                    errorMessage
                }
            },
            { new: true }
        );
    }

    async markTargetStatusByCommand(commandId, deviceIdString, status_, payload = {}) {
        try {
            const device = await this.db.devices.findOne({ deviceId: deviceIdString });
            if (!device) {
                console.error(`[CommandRepo] Device not found for deviceIdString: ${deviceIdString}`);
                return;
            }

            const deviceDbId = device._id.toString();
            const updateFields = { status: status_ };

            if (status_ === "DELIVERED" || status_ === "ACKNOWLEDGED") {
                updateFields.acknowledgedAt = new Date();
                updateFields.status = "ACKNOWLEDGED";
            } else if (status_ === "COMPLETED") {
                updateFields.completedAt = new Date();
            } else if (status_ === "FAILED") {
                updateFields.errorMessage = payload.error || "Command failed";
            }

            const target = await this.db.deviceCommandTarget.findOneAndUpdate(
                { commandId: commandId, deviceId: deviceDbId },
                { $set: updateFields },
                { new: true }
            );

            if (target && (status_ === "COMPLETED" || status_ === "FAILED")) {
                await this.saveResult(target._id, {
                    stdout: payload.stdout || null,
                    stderr: payload.error || null,
                    exitCode: status_ === "COMPLETED" ? 0 : 1,
                    data: payload
                });
            }

            // Rollup status to parent deviceCommand
            const allTargets = await this.db.deviceCommandTarget.find({ commandId });
            if (allTargets.length > 0) {
                const finished = allTargets.every(t => ["COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED"].includes(t.status));
                if (finished) {
                    const hasFailures = allTargets.some(t => ["FAILED", "TIMED_OUT"].includes(t.status));
                    await this.db.deviceCommand.findByIdAndUpdate(commandId, {
                        status: hasFailures ? "FAILED" : "COMPLETED"
                    });
                }
            }

            return target;
        } catch (error) {
            console.error("[CommandRepo] Error updating target status by command:", error);
            throw error;
        }
    }

    async saveResult(commandTargetId, result) {
        await this.db.deviceCommandResult.create({
            commandTargetId,
            stdout: result.stdout || null,
            stderr: result.stderr || null,
            resultJson: JSON.stringify(result.data || {}),
            exitCode: result.exitCode || 0
        });
    }
}

module.exports = CommandRepository;