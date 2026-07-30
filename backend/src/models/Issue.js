const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MobileUserProfile',
    default: null,
  },
  reporterName: {
    type: String,
    default: 'Anonymous',
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'General',
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['seen', 'pending', 'resolved', 'open', 'progress'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.models.Issue || mongoose.model('Issue', IssueSchema);
