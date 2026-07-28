const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const IssueVote = require('../models/IssueVote');
const AppUser = require('../models/AppUser');
const CheckinTicket = require('../models/CheckinTicket');
const { protectAppUser, optionalAppUser, protect } = require('../middleware/auth');
const { logAudit } = require('../middleware/AuditLogger');

// Get issues list with user vote direction if logged in
router.get('/issues', optionalAppUser, async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });

    let userVotesMap = {};
    if (req.appUser) {
      const votes = await IssueVote.find({ userId: req.appUser._id });
      votes.forEach((v) => {
        userVotesMap[v.issueId.toString()] = v.direction;
      });
    }

    // Seed initial issues if empty
    if (issues.length === 0) {
      const initialData = [
        {
          category: 'wifi',
          description: 'Slow wifi in lounge during peak morning hours',
          status: 'open',
          upvotes: 6,
          downvotes: 0,
        },
        {
          category: 'ac',
          description: 'AC not cooling properly in seminar room',
          status: 'in-progress',
          upvotes: 11,
          downvotes: 1,
        },
        {
          category: 'noise',
          description: 'Noise level high near training lab entrance',
          status: 'resolved',
          upvotes: 3,
          downvotes: 0,
        },
      ];
      await Issue.insertMany(initialData);
      return res.redirect('/api/issues');
    }

    const formatted = issues.map((i) => ({
      _id: i._id,
      category: i.category,
      description: i.description,
      status: i.status,
      upvotes: i.upvotes || 0,
      downvotes: i.downvotes || 0,
      score: (i.upvotes || 0) - (i.downvotes || 0),
      userVote: userVotesMap[i._id.toString()] || 0,
      createdAt: i.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch issues' });
  }
});

// App visitor: Post issue
router.post('/issues', optionalAppUser, async (req, res) => {
  try {
    const { category, description } = req.body;
    if (!description || !category) {
      return res.status(400).json({ message: 'Category and description are required' });
    }

    const issue = await Issue.create({
      reporterId: req.appUser ? req.appUser._id : null,
      category,
      description,
      status: 'open',
      upvotes: 1,
    });

    // Auto-add upvote for reporter
    if (req.appUser) {
      await IssueVote.create({
        issueId: issue._id,
        userId: req.appUser._id,
        direction: 1,
      });
    }

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to post issue' });
  }
});

// App visitor: Upvote / Downvote issue
router.post('/issues/:id/vote', protectAppUser, async (req, res) => {
  try {
    const { direction } = req.body; // +1 or -1
    const dir = parseInt(direction, 10);
    if (![1, -1].includes(dir)) {
      return res.status(400).json({ message: 'Direction must be 1 (upvote) or -1 (downvote)' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const userId = req.appUser._id;
    const existingVote = await IssueVote.findOne({ issueId: issue._id, userId });

    if (existingVote) {
      if (existingVote.direction === dir) {
        // Toggle vote off if clicking same direction
        await existingVote.deleteOne();
      } else {
        existingVote.direction = dir;
        await existingVote.save();
      }
    } else {
      await IssueVote.create({
        issueId: issue._id,
        userId,
        direction: dir,
      });
    }

    // Recompute total upvotes and downvotes for this issue
    const upvotesCount = await IssueVote.countDocuments({ issueId: issue._id, direction: 1 });
    const downvotesCount = await IssueVote.countDocuments({ issueId: issue._id, direction: -1 });

    issue.upvotes = upvotesCount;
    issue.downvotes = downvotesCount;
    await issue.save();

    const updatedVote = await IssueVote.findOne({ issueId: issue._id, userId });

    res.json({
      issueId: issue._id,
      upvotes: issue.upvotes,
      downvotes: issue.downvotes,
      score: issue.upvotes - issue.downvotes,
      userVote: updatedVote ? updatedVote.direction : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to process vote' });
  }
});

// STAFF: List issues
router.get('/staff/issues', protect, async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate('reporterId', 'name email displayName isAnonymous currentStreak')
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch staff issues' });
  }
});

// STAFF: Update issue status or resolution notes
router.patch('/staff/issues/:id', protect, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    if (status) issue.status = status;
    if (resolutionNotes !== undefined) issue.resolutionNotes = resolutionNotes;
    if (status === 'resolved') {
      issue.resolvedBy = req.user._id;
      issue.resolvedAt = new Date();
    }

    await issue.save();

    await logAudit(
      'ISSUE_STATUS_UPDATED',
      req.user,
      issue._id.toString(),
      { status: issue.status, category: issue.category },
      req.ip
    );

    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update issue' });
  }
});

// STAFF: Special action for missing-checkin resolution (backdated check-in & streak fix)
router.post('/staff/issues/:id/resolve-missing-checkin', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    if (!issue.reporterId) {
      return res.status(400).json({ message: 'This issue does not have an attached user to resolve check-in for' });
    }

    const appUser = await AppUser.findById(issue.reporterId);
    if (!appUser) {
      return res.status(404).json({ message: 'Reporter user account not found' });
    }

    // Increment streak
    appUser.currentStreak = (appUser.currentStreak || 0) + 1;
    if (appUser.currentStreak > (appUser.longestStreak || 0)) {
      appUser.longestStreak = appUser.currentStreak;
    }
    appUser.lastCheckinDate = new Date();
    await appUser.save();

    // Mark issue as resolved
    issue.status = 'resolved';
    issue.resolutionNotes = `Resolved by staff. Backdated check-in granted. Updated streak to ${appUser.currentStreak}.`;
    issue.resolvedBy = req.user._id;
    issue.resolvedAt = new Date();
    await issue.save();

    await logAudit(
      'MISSING_CHECKIN_RESOLVED_MANUAL_STREAK',
      req.user,
      appUser._id.toString(),
      { issueId: issue._id.toString(), newStreak: appUser.currentStreak },
      req.ip
    );

    res.json({
      message: `Dispute resolved and backdated check-in granted. User streak is now ${appUser.currentStreak}.`,
      issue,
      appUserStreak: appUser.currentStreak,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to resolve check-in dispute' });
  }
});

module.exports = router;
