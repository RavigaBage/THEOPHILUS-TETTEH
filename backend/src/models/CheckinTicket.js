const mongoose = require('mongoose');

const CheckinTicketSchema = new mongoose.Schema({
  mobileUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MobileUserProfile',
    required: false,
  },
  ticketCode: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'expired'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  confirmedAt: {
    type: Date,
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userName: {
    type: String,
    default: 'Guest',
  },
  contact: {
    type: String,
    default: 'N/A',
  },
  identifierType: {
    type: String,
    default: 'student_id',
  },
  identifier: {
    type: String,
    default: '',
  },
  gender: {
    type: String,
    default: 'other',
  },
  anonymous: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.models.CheckinTicket || mongoose.model('CheckinTicket', CheckinTicketSchema);
