const express = require('express');
const router = express.Router();
const CheckinTicket = require('../models/CheckinTicket');
const AppUser = require('../models/AppUser');
const { protectAppUser, protect } = require('../middleware/auth');
const { logAudit } = require('../middleware/AuditLogger');

// Generate random short human-readable ticket code e.g. HUB-7F2K9
function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HUB-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if two dates are same calendar day
function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Check if d1 is yesterday relative to d2
function isYesterday(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diffDays = Math.round((b.getTime() - a.getTime()) / (1000 * 3600 * 24));
  return diffDays === 1;
}

// App Visitor: Request check-in ticket
router.post('/checkins', protectAppUser, async (req, res) => {
  try {
    const userId = req.appUser._id;
    const now = new Date();

    // Check if user already has an active pending ticket
    const activePending = await CheckinTicket.findOne({
      userId,
      status: 'pending',
      expiresAt: { $gt: now },
    });

    if (activePending) {
      return res.json({
        ticket: activePending,
        message: 'Active ticket pending confirmation',
      });
    }

    // Check if user already confirmed check-in today
    const confirmedToday = await CheckinTicket.findOne({
      userId,
      status: 'confirmed',
      confirmedAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      },
    });

    if (confirmedToday) {
      return res.status(400).json({
        message: 'You have already checked in today!',
        ticket: confirmedToday,
      });
    }

    let ticketCode = generateTicketCode();
    let collision = await CheckinTicket.findOne({ ticketCode });
    while (collision) {
      ticketCode = generateTicketCode();
      collision = await CheckinTicket.findOne({ ticketCode });
    }

    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins TTL

    const ticket = await CheckinTicket.create({
      userId,
      ticketCode,
      status: 'pending',
      requestedAt: now,
      expiresAt,
    });

    res.status(201).json({
      ticket,
      message: 'Check-in ticket created. Present to staff desk for verification.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create checkin ticket' });
  }
});

// App Visitor: Poll ticket status
router.get('/checkins/:id/status', protectAppUser, async (req, res) => {
  try {
    const ticket = await CheckinTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    if (ticket.userId.toString() !== req.appUser._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized ticket access' });
    }

    res.json({
      ticket,
      userStreak: {
        currentStreak: req.appUser.currentStreak,
        longestStreak: req.appUser.longestStreak,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error fetching ticket status' });
  }
});

// STAFF: Get pending check-in queue
router.get('/staff/checkins/pending', protect, async (req, res) => {
  try {
    const now = new Date();
    const pendingTickets = await CheckinTicket.find({
      status: 'pending',
      expiresAt: { $gt: now },
    })
      .populate('userId', 'name email displayName isAnonymous currentStreak longestStreak')
      .sort({ requestedAt: 1 });

    const formatted = pendingTickets.map((t) => {
      const u = t.userId || {};
      const hash = u._id ? u._id.toString().slice(-4).toUpperCase() : '0000';
      const displayName = u.isAnonymous ? `Guest #${hash}` : (u.displayName || u.name || 'Visitor');
      return {
        _id: t._id,
        ticketCode: t.ticketCode,
        status: t.status,
        requestedAt: t.requestedAt,
        expiresAt: t.expiresAt,
        user: {
          id: u._id,
          name: u.name,
          displayName,
          email: u.email,
          currentStreak: u.currentStreak || 0,
        },
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch pending checkins' });
  }
});

// STAFF: Confirm check-in ticket
router.post('/staff/checkins/:id/confirm', protect, async (req, res) => {
  try {
    const ticket = await CheckinTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    if (ticket.status === 'confirmed') {
      return res.status(400).json({ message: 'Ticket has already been confirmed' });
    }

    const appUser = await AppUser.findById(ticket.userId);
    if (!appUser) {
      return res.status(404).json({ message: 'Associated app user not found' });
    }

    const now = new Date();
    ticket.status = 'confirmed';
    ticket.confirmedAt = now;
    ticket.confirmedBy = req.user._id;
    await ticket.save();

    // Streak logic
    const lastCheckin = appUser.lastCheckinDate;
    if (!lastCheckin) {
      appUser.currentStreak = 1;
    } else if (isSameDay(lastCheckin, now)) {
      // already checked in earlier today, maintain streak
    } else if (isYesterday(lastCheckin, now)) {
      appUser.currentStreak += 1;
    } else {
      appUser.currentStreak = 1;
    }

    if (appUser.currentStreak > appUser.longestStreak) {
      appUser.longestStreak = appUser.currentStreak;
    }

    appUser.lastCheckinDate = now;
    await appUser.save();

    await logAudit(
      'CHECKIN_CONFIRMED',
      req.user,
      appUser._id.toString(),
      { ticketCode: ticket.ticketCode, newStreak: appUser.currentStreak },
      req.ip
    );

    res.json({
      message: 'Check-in confirmed successfully',
      ticket,
      updatedStreak: appUser.currentStreak,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to confirm checkin' });
  }
});

// STAFF: Reject ticket
router.post('/staff/checkins/:id/reject', protect, async (req, res) => {
  try {
    const ticket = await CheckinTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = 'rejected';
    await ticket.save();

    await logAudit(
      'CHECKIN_REJECTED',
      req.user,
      ticket.userId?.toString(),
      { ticketCode: ticket.ticketCode },
      req.ip
    );

    res.json({ message: 'Ticket rejected', ticket });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to reject ticket' });
  }
});

module.exports = router;
