const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['pinned', 'event', 'class', 'notice'],
    default: 'notice',
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: null,
  },
  startsAt: {
    type: Date,
    default: null,
  },
  endsAt: {
    type: Date,
    default: null,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
