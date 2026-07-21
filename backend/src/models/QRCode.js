const mongoose = require('mongoose');

const QRCodeSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  label: { type: String },
  durationValue: { type: Number, required: true },
  durationUnit: { type: String, required: true, enum: ['hours', 'days', 'minutes'] },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'deactivated'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submissionCount: { type: Number, default: 0 }
}, { timestamps: true });

// We can compute live status by checking if expiresAt < Date.now()
// Or we can just store deactivated status.

module.exports = mongoose.models.QRCode || mongoose.model('QRCode', QRCodeSchema);
