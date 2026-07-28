const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['pinned', 'event', 'class', 'notice'],
      default: 'notice',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    endsAt: {
      type: Date,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Iac_users',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', AnnouncementSchema, 'announcements');
