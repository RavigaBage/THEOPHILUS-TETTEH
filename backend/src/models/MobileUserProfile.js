const mongoose = require('mongoose');

const mobileUserProfileSchema = new mongoose.Schema(
  {
    mobileUserId: { type: String, required: true, unique: true },
    name: { type: String, default: 'Mobile Visitor' },
    email: { type: String, default: '' },
    streak: { type: Number, default: 0 },
    totalCheckins: { type: Number, default: 0 },
    lastCheckinDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MobileUserProfile', mobileUserProfileSchema);
