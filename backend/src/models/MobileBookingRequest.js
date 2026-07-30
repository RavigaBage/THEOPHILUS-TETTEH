const mongoose = require('mongoose');

const MobileBookingRequestSchema = new mongoose.Schema({
  mobileUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MobileUserProfile',
    default: null,
  },
  contactName: {
    type: String,
    required: true,
  },
  contactEmail: {
    type: String,
    required: true,
  },
  roomId: {
    type: String,
    required: true,
  },
  requestedDate: {
    type: String,
    required: true,
  },
  requestedSlot: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending',
  },
  existingBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventProgram',
    default: null,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.models.MobileBookingRequest || mongoose.model('MobileBookingRequest', MobileBookingRequestSchema);
