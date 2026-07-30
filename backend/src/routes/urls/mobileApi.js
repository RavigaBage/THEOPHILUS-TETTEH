const express = require('express');
const router = express.Router();
const CheckinTicket = require('../../models/CheckinTicket');
const LoungeData = require('../../models/InternetLounge');
const Issue = require('../../models/Issue');
const IssueVote = require('../../models/IssueVote');
const Announcement = require('../../models/Announcement');
const MobileBookingRequest = require('../../models/MobileBookingRequest');
const BookingData = require('../../models/booking');
const MobileUserProfile = require('../../models/MobileUserProfile');
const SystemSettings = require('../../models/SystemSettings');
const { protect, restrictTo } = require('../../middleware/auth');
const { sendEmail, sendTestEmail } = require('../../services/emailService');

// Helper to generate a random Ticket Code like HUB-X8K9L
function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HUB-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --------------------------------------------------
// 1. ANNOUNCEMENTS (PUBLIC GET & ADMIN CRUD)
// --------------------------------------------------

// Public active announcements sorted by sortOrder
router.get('/announcements', async (req, res) => {
  try {
    const list = await Announcement.find({}).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ status: 'success', data: list });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin CRUD announcements
router.post('/announcements', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { category, title, description, imageUrl, startsAt, endsAt, sortOrder } = req.body;
    const item = await Announcement.create({
      category: category || 'notice',
      title,
      description: description || '',
      imageUrl: imageUrl || null,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      sortOrder: sortOrder || 0,
    });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.put('/announcements/:id', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Announcement.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ status: 'error', message: 'Announcement not found' });
    res.json({ status: 'success', data: item });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.delete('/announcements/:id', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Announcement.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ status: 'error', message: 'Announcement not found' });
    res.json({ status: 'success', message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// --------------------------------------------------
// 2. MOBILE USER PROFILE & LEADERBOARD
// --------------------------------------------------

// Create or get user profile by deviceId
router.post('/mobile/profile', async (req, res) => {
  try {
    const { deviceId, name, email, isAnonymous } = req.body;
    if (!deviceId) return res.status(400).json({ status: 'error', message: 'deviceId required' });

    let profile = await MobileUserProfile.findOne({ deviceId });
    if (!profile) {
      profile = await MobileUserProfile.create({
        deviceId,
        name: name || 'Guest User',
        email: email || '',
        streak: 0,
        isAnonymous: !!isAnonymous,
      });
    } else if (name || email !== undefined) {
      if (name) profile.name = name;
      if (email !== undefined) profile.email = email;
      if (isAnonymous !== undefined) profile.isAnonymous = isAnonymous;
      await profile.save();
    }
    res.json({ status: 'success', data: profile });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Leaderboard: top streaks
router.get('/mobile/leaderboard', async (req, res) => {
  try {
    const profiles = await MobileUserProfile.find({})
      .sort({ streak: -1, updatedAt: -1 })
      .limit(20);
    
    // Format profiles nicely
    const leaderboard = profiles.map((p, idx) => ({
      _id: p._id,
      rank: idx + 1,
      name: p.isAnonymous ? `Guest #${p.deviceId.slice(-4)}` : (p.name || 'Anonymous'),
      streak: p.streak || 0,
      deviceId: p.deviceId,
    }));

    res.json({ status: 'success', data: leaderboard });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// --------------------------------------------------
// 3. CHECK-IN TICKET SYSTEM
// --------------------------------------------------

// Mobile User: create check-in ticket
router.post('/mobile/checkin/ticket', async (req, res) => {
  try {
    const { deviceId, userName, contact, identifierType, identifier, gender, anonymous } = req.body;
    let mobileUser = null;
    if (deviceId) {
      mobileUser = await MobileUserProfile.findOne({ deviceId });
    }

    let ticketCode = generateTicketCode();
    // Ensure code uniqueness
    while (await CheckinTicket.findOne({ ticketCode })) {
      ticketCode = generateTicketCode();
    }

    const ticket = await CheckinTicket.create({
      mobileUserId: mobileUser ? mobileUser._id : null,
      ticketCode,
      status: 'pending',
      requestedAt: new Date(),
      userName: userName || (mobileUser ? mobileUser.name : 'Guest'),
      contact: contact || 'N/A',
      identifierType: identifierType || 'student_id',
      identifier: identifier || (deviceId ? deviceId.slice(-6) : ''),
      gender: gender || 'other',
      anonymous: !!anonymous,
    });

    res.status(201).json({ status: 'success', data: ticket });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Mobile User: poll status of ticket
router.get('/mobile/checkin/ticket/status/:ticketCode', async (req, res) => {
  try {
    const ticket = await CheckinTicket.findOne({ ticketCode: req.params.ticketCode });
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' });
    res.json({ status: 'success', data: ticket });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin / Staff: list pending tickets
router.get('/mobile/checkin/pending', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const pendingTickets = await CheckinTicket.find({ status: 'pending' }).sort({ requestedAt: 1 });
    res.json({ status: 'success', data: pendingTickets });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin / Staff: confirm check-in ticket
router.post('/mobile/checkin/confirm/:id', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await CheckinTicket.findById(id);
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' });

    if (ticket.status === 'confirmed') {
      return res.status(400).json({ status: 'error', message: 'Ticket is already confirmed' });
    }

    // 1. Mark ticket confirmed
    ticket.status = 'confirmed';
    ticket.confirmedAt = new Date();
    ticket.confirmedBy = req.user._id;
    await ticket.save();

    // 2. Call existing Lounge checkin creation logic (InternetLounge / LoungeData)
    const loungeRecord = await LoungeData.create({
      Signature: ticket.userName,
      name: ticket.userName,
      contactNumber: ticket.contact || 'N/A',
      identifier: ticket.identifier || 'N/A',
      identifierType: ticket.identifierType || 'student_id',
      gender: ticket.gender || 'other',
      timeIn: new Date(),
      timeOut: null,
    });

    // 3. Update mobile user streak ONLY after loungeRecord is successfully created
    let updatedProfile = null;
    if (ticket.mobileUserId) {
      updatedProfile = await MobileUserProfile.findByIdAndUpdate(
        ticket.mobileUserId,
        { $inc: { streak: 1 } },
        { new: true }
      );
    }

    res.json({
      status: 'success',
      message: 'Ticket confirmed and Lounge visit logged successfully',
      data: {
        ticket,
        loungeRecord,
        streak: updatedProfile ? updatedProfile.streak : null,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// --------------------------------------------------
// 4. ISSUES & VOTES
// --------------------------------------------------

// Get all issues with calculated vote counts
router.get('/mobile/issues', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const issues = await Issue.find({}).sort({ createdAt: -1 });

    // Aggregate votes for each issue
    const issueIds = issues.map(i => i._id);
    const votes = await IssueVote.find({ issueId: { $in: issueIds } });

    const voteCountsMap = {};
    const userVoteMap = {};

    votes.forEach(v => {
      const idStr = v.issueId.toString();
      if (!voteCountsMap[idStr]) voteCountsMap[idStr] = { up: 0, down: 0, net: 0 };
      if (v.direction === 1) voteCountsMap[idStr].up += 1;
      if (v.direction === -1) voteCountsMap[idStr].down += 1;
      voteCountsMap[idStr].net += v.direction;

      if (deviceId && v.mobileUserId === deviceId) {
        userVoteMap[idStr] = v.direction;
      }
    });

    const result = issues.map(iss => {
      const idStr = iss._id.toString();
      const stats = voteCountsMap[idStr] || { up: 0, down: 0, net: 0 };
      return {
        _id: iss._id,
        title: iss.title,
        category: iss.category,
        description: iss.description,
        status: iss.status,
        reporterName: iss.reporterName,
        createdAt: iss.createdAt,
        upvotes: stats.up,
        downvotes: stats.down,
        netVotes: stats.net,
        myVote: userVoteMap[idStr] || 0,
      };
    });

    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Report an issue
router.post('/mobile/issues', async (req, res) => {
  try {
    const { title, category, description, deviceId, reporterName } = req.body;
    if (!title) return res.status(400).json({ status: 'error', message: 'Title is required' });

    let reporterId = null;
    if (deviceId) {
      const profile = await MobileUserProfile.findOne({ deviceId });
      if (profile) reporterId = profile._id;
    }

    const newIssue = await Issue.create({
      reporterId,
      reporterName: reporterName || 'Anonymous',
      title,
      category: category || 'General',
      description: description || '',
      status: 'pending',
    });

    res.status(201).json({ status: 'success', data: newIssue });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Vote on an issue
router.post('/mobile/issues/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, direction } = req.body; // direction: 1 or -1

    if (!deviceId) return res.status(400).json({ status: 'error', message: 'deviceId is required' });
    if (![1, -1].includes(direction)) return res.status(400).json({ status: 'error', message: 'Invalid vote direction' });

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ status: 'error', message: 'Issue not found' });

    // Lock voting if issue is resolved!
    if (issue.status === 'resolved') {
      return res.status(403).json({ status: 'error', message: 'Voting is closed for resolved issues' });
    }

    // Single vote per user per issue
    let existingVote = await IssueVote.findOne({ issueId: id, mobileUserId: deviceId });
    if (existingVote) {
      if (existingVote.direction === direction) {
        // Toggle off if same direction
        await IssueVote.findByIdAndDelete(existingVote._id);
      } else {
        existingVote.direction = direction;
        await existingVote.save();
      }
    } else {
      await IssueVote.create({
        issueId: id,
        mobileUserId: deviceId,
        direction,
      });
    }

    res.json({ status: 'success', message: 'Vote recorded' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: Update issue status (seen / pending / resolved)
router.patch('/mobile/issues/:id/status', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['seen', 'pending', 'resolved'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value' });
    }

    const issue = await Issue.findByIdAndUpdate(id, { status }, { new: true });
    if (!issue) return res.status(404).json({ status: 'error', message: 'Issue not found' });

    res.json({ status: 'success', data: issue });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// --------------------------------------------------
// 5. MOBILE BOOKING REQUESTS
// --------------------------------------------------

// User: Submit room booking request
router.post('/mobile/bookings', async (req, res) => {
  try {
    const { deviceId, contactName, contactEmail, roomId, requestedDate, requestedSlot } = req.body;
    if (!contactName || !contactEmail || !roomId || !requestedDate || !requestedSlot) {
      return res.status(400).json({ status: 'error', message: 'Missing required booking fields' });
    }

    let mobileUserId = null;
    if (deviceId) {
      const profile = await MobileUserProfile.findOne({ deviceId });
      if (profile) mobileUserId = profile._id;
    }

    const bookingReq = await MobileBookingRequest.create({
      mobileUserId,
      contactName,
      contactEmail,
      roomId,
      requestedDate,
      requestedSlot,
      status: 'pending',
    });

    res.status(201).json({ status: 'success', data: bookingReq });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: List booking requests
router.get('/mobile/bookings', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await MobileBookingRequest.find(filter).sort({ createdAt: -1 });
    res.json({ status: 'success', data: requests });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: Confirm booking request
router.post('/mobile/bookings/:id/confirm', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const reqItem = await MobileBookingRequest.findById(id);
    if (!reqItem) return res.status(404).json({ status: 'error', message: 'Booking request not found' });

    if (reqItem.status === 'confirmed') {
      return res.status(400).json({ status: 'error', message: 'Booking request is already confirmed' });
    }

    // Determine room details for existing booking model
    let roomNum = 1;
    if (reqItem.roomId.includes('Conference')) roomNum = 2;
    if (reqItem.roomId.includes('Training')) roomNum = 3;

    const startDateTime = new Date(`${reqItem.requestedDate}T${reqItem.requestedSlot || '09:00'}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    // 1. Create entry in existing booking collection (EventProgram / booking.js)
    const newBooking = await BookingData.create({
      startDate: startDateTime,
      endDate: endDateTime,
      status: 'confirmed',
      roomNumber: roomNum,
      name: reqItem.contactName,
      organizer: reqItem.contactName,
      presenter: reqItem.contactName,
      programName: `Mobile Reservation: ${reqItem.roomId}`,
      participants: 10,
      eventType: 'meetings',
      category: 'others',
      beneficiaries: 'students',
      description: `Requested via mobile app by ${reqItem.contactEmail} for ${reqItem.requestedSlot}`,
      roomType: reqItem.roomId,
    });

    // 2. Mark MobileBookingRequest as confirmed with reference ID
    reqItem.status = 'confirmed';
    reqItem.existingBookingId = newBooking._id;
    await reqItem.save();

    // 3. Send confirmation email
    const emailSubject = `Booking Confirmed: ${reqItem.roomId} at ${reqItem.requestedSlot}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #12201B; max-width: 600px; margin: 0 auto; border: 1px solid #1D8478; border-radius: 8px;">
        <h2 style="color: #1D8478; margin-top: 0;">Reservation Confirmed</h2>
        <p>Dear <strong>${reqItem.contactName}</strong>,</p>
        <p>Your room booking request has been <strong>approved and confirmed</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 6px 0; color: #555;">Room:</td><td><strong>${reqItem.roomId}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #555;">Date:</td><td><strong>${reqItem.requestedDate}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #555;">Time Slot:</td><td><strong>${reqItem.requestedSlot}</strong></td></tr>
        </table>
        <p>Thank you for using the IAC System!</p>
      </div>
    `;
    sendEmail({ to: reqItem.contactEmail, subject: emailSubject, html: emailHtml }).catch(err => {
      console.error('[Booking Email Error]', err);
    });

    res.json({ status: 'success', message: 'Booking confirmed and logged', data: { request: reqItem, booking: newBooking } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: Reject booking request
router.post('/mobile/bookings/:id/reject', protect, restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reqItem = await MobileBookingRequest.findById(id);
    if (!reqItem) return res.status(404).json({ status: 'error', message: 'Booking request not found' });

    reqItem.status = 'rejected';
    reqItem.rejectionReason = reason || 'Room unavailable or time conflict';
    await reqItem.save();

    // Send rejection email
    const emailSubject = `Booking Request Status: ${reqItem.roomId}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #12201B; max-width: 600px; margin: 0 auto; border: 1px solid #d9534f; border-radius: 8px;">
        <h2 style="color: #d9534f; margin-top: 0;">Reservation Request Update</h2>
        <p>Dear <strong>${reqItem.contactName}</strong>,</p>
        <p>We regret to inform you that your booking request for <strong>${reqItem.roomId}</strong> on <strong>${reqItem.requestedDate} (${reqItem.requestedSlot})</strong> could not be approved at this time.</p>
        <p><strong>Reason:</strong> ${reqItem.rejectionReason}</p>
        <p>Please log into the app to choose an alternative time slot or room.</p>
      </div>
    `;
    sendEmail({ to: reqItem.contactEmail, subject: emailSubject, html: emailHtml }).catch(err => {
      console.error('[Booking Email Error]', err);
    });

    res.json({ status: 'success', message: 'Booking request rejected', data: reqItem });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// --------------------------------------------------
// 6. SYSTEM SETTINGS & TEST EMAIL
// --------------------------------------------------

router.get('/settings/smtp', protect, restrictTo('admin'), async (req, res) => {
  try {
    let settings = await SystemSettings.findOne({ key: 'default_settings' });
    if (!settings) {
      settings = await SystemSettings.create({ key: 'default_settings' });
    }
    // Mask password in response
    const data = settings.toObject();
    data.smtpPass = data.smtpPass ? '********' : '';
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.put('/settings/smtp', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, fromName, fromEmail } = req.body;
    let settings = await SystemSettings.findOne({ key: 'default_settings' });
    if (!settings) {
      settings = new SystemSettings({ key: 'default_settings' });
    }

    if (smtpHost !== undefined) settings.smtpHost = smtpHost;
    if (smtpPort !== undefined) settings.smtpPort = smtpPort;
    if (smtpSecure !== undefined) settings.smtpSecure = smtpSecure;
    if (smtpUser !== undefined) settings.smtpUser = smtpUser;
    if (smtpPass && smtpPass !== '********') settings.smtpPass = smtpPass;
    if (fromName !== undefined) settings.fromName = fromName;
    if (fromEmail !== undefined) settings.fromEmail = fromEmail;

    await settings.save();
    res.json({ status: 'success', message: 'SMTP settings updated', data: settings });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.post('/settings/smtp/test', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { testEmail } = req.body;
    const target = testEmail || req.user.email;
    if (!target) return res.status(400).json({ status: 'error', message: 'Target email required' });

    const result = await sendTestEmail(target);
    if (result.success) {
      res.json({ status: 'success', message: `Test email sent to ${target}`, result });
    } else {
      res.status(500).json({ status: 'error', message: result.error || 'Failed to send test email' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
