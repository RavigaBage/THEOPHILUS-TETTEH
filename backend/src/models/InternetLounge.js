const mongoose = require('mongoose');

const InternetLoungeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    identifier: { type: String, required: true },
    identifierType: { type: String, default: 'ghana_card' },
    contactNumber: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], default: 'male' },
    timeIn: { type: String, required: true },
    timeOut: { type: String },
    Signature: { type: String, default: 'Signed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InternetLounge', InternetLoungeSchema, 'internet_lounge');
