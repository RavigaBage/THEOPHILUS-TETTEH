const mongoose = require('mongoose');

const IssueVoteSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppUser',
      required: true,
      index: true,
    },
    direction: {
      type: Number,
      enum: [1, -1], // +1 for upvote, -1 for downvote
      required: true,
    },
  },
  { timestamps: true }
);

IssueVoteSchema.index({ issueId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('IssueVote', IssueVoteSchema, 'issue_votes');
