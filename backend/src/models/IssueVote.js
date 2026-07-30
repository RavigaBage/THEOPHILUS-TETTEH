const mongoose = require('mongoose');

const IssueVoteSchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
  },
  mobileUserId: {
    type: String,
    required: true,
  },
  direction: {
    type: Number,
    enum: [1, -1],
    required: true,
  },
}, { timestamps: true });

IssueVoteSchema.index({ issueId: 1, mobileUserId: 1 }, { unique: true });

module.exports = mongoose.models.IssueVote || mongoose.model('IssueVote', IssueVoteSchema);
