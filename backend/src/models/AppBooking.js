const mongoose = require('mongoose');

const AppBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppUser',
      required: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      default: 'General Study / Meeting',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined', 'cancelled'],
      default: 'pending',
    },
    declineReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppBooking', AppBookingSchema, 'app_bookings');
