const AuditLog = require('../models/AuditLog');

const logAudit = async (action, performedBy, targetId = null, details = {}, ipAddress = '') => {
  try {
    await AuditLog.create({
      action,
      performedBy: typeof performedBy === 'object' ? (performedBy.name || performedBy.email || performedBy._id) : performedBy,
      targetId,
      details,
      ipAddress,
    });
  } catch (err) {
    console.error('AuditLog writing failed:', err.message);
  }
};

module.exports = { logAudit };
