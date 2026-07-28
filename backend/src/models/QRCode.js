const mongoose = require('mongoose');

const QRCodeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    durationValue: { type: Number, required: true },
    durationUnit: { type: String, default: 'hours' },
    expiresAt: { type: Date, required: true },
    computedStatus: { type: String, default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QRCode', QRCodeSchema, 'qrcodes');
