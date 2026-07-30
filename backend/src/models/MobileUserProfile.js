const mongoose = require('mongoose');

const MobileUserProfileSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: 'Guest User',
  },
  email: {
    type: String,
    default: '',
  },
  streak: {
    type: Number,
    default: 0,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.models.MobileUserProfile || mongoose.model('MobileUserProfile', MobileUserProfileSchema);
