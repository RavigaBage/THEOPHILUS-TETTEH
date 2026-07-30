const express = require('express');
const router = express.Router();
const CheckinTicket = require('../../models/CheckinTicket');
const MobileUserProfile = require('../../models/MobileUserProfile');
const Issue = require('../../models/Issue');
const IssueVote = require('../../models/IssueVote');
const Announcement = require('../../models/Announcement');
const MobileBookingRequest = require('../../models/MobileBookingRequest');
const SmtpConfig = require('../../models/SmtpConfig');
const InternetLounge = require('../../models/InternetLounge');
const Booking = require('../../models/booking');
const { sendEmail, verifyAndSendTestEmail } = require('../../services/mailerService');

// -------------------------------------------------------------
// 1. CHECK-IN TICKETS
// -------------------------------------------------------------

// Get all checkin tickets (Admin or mobile queue)
router.get('/checkin-tickets', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const tickets = await CheckinTicket.find(filter).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create checkin ticket (Mobile user action)
router.post('/checkin-tickets', async (req, res) => {
  try {
    const { mobileUserId, mobileUserName, mobileUserEmail } = req.body;
    if (!mobileUserId) {
      return res.status(400).json({ error: 'mobileUserId is required' });
    }

    // Generate unique code like IAC-7892
    const code = 'IAC-' + Math.floor(1000 + Math.random() * 9000);

    const ticket = new CheckinTicket({
      mobileUserId,
      mobileUserName: mobileUserName || 'Mobile Visitor',
      mobileUserEmail: mobileUserEmail || '',
      ticketCode: code,
      status: 'pending',
      requestedAt: new Date(),
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm checkin ticket (Admin action)
router.post('/checkin-tickets/:id/confirm', async (req, res) => {
  try {
    const ticket = await CheckinTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'confirmed') {
      return res.status(400).json({ error: 'Ticket already confirmed' });
    }

    const { staffName, identifier, identifierType, contactNumber, gender } = req.body;

    // 1. Create record in existing InternetLounge collection as per single source of truth rule
    const loungeEntry = new InternetLounge({
      name: ticket.mobileUserName || 'Mobile Visitor',
      identifier: identifier || `MOB-${ticket.ticketCode}-${Date.now().toString().slice(-4)}`,
      identifierType: identifierType || 'other',
      contactNumber: contactNumber || '0000000000',
      gender: gender || 'other',
      timeIn: new Date().toLocaleTimeString('en-US', { hour12: false }),
      Signature: `Mobile Ticket Pass ${ticket.ticketCode}`,
    });

    await loungeEntry.save();

    // 2. Mark CheckinTicket as confirmed
    ticket.status = 'confirmed';
    ticket.confirmedAt = new Date();
    ticket.confirmedBy = staffName || 'Admin Staff';
    await ticket.save();

    // 3. Update MobileUserProfile streak & total checkins ONLY after lounge entry creation
    let profile = await MobileUserProfile.findOne({ mobileUserId: ticket.mobileUserId });
    if (!profile) {
      profile = new MobileUserProfile({
        mobileUserId: ticket.mobileUserId,
        name: ticket.mobileUserName,
        email: ticket.mobileUserEmail,
      });
    }

    const now = new Date();
    const lastDate = profile.lastCheckinDate ? new Date(profile.lastCheckinDate) : null;

    let isConsecutiveDay = false;
    if (lastDate) {
      const diffTime = Math.abs(now - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) isConsecutiveDay = true;
    }

    profile.streak = isConsecutiveDay ? profile.streak + 1 : 1;
    profile.totalCheckins += 1;
    profile.lastCheckinDate = now;
    await profile.save();

    res.json({
      message: 'Check-in ticket confirmed and logged to Lounge system successfully',
      ticket,
      loungeEntry,
      userStreak: profile.streak,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. REPORTS & ISSUES
// -------------------------------------------------------------

// Get issues
router.get('/issues', async (req, res) => {
  try {
    const { mobileUserId } = req.query;
    const issues = await Issue.find().sort({ createdAt: -1 }).lean();

    // If mobileUserId is supplied, attach current user's vote
    if (mobileUserId) {
      const issueIds = issues.map((i) => i._id);
      const votes = await IssueVote.find({
        issueId: { $in: issueIds },
        mobileUserId,
      });

      const voteMap = {};
      votes.forEach((v) => {
        voteMap[v.issueId.toString()] = v.direction;
      });

      issues.forEach((i) => {
        i.userVote = voteMap[i._id.toString()] || null;
      });
    }

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create issue
router.post('/issues', async (req, res) => {
  try {
    const { reporterId, reporterName, category, description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const issue = new Issue({
      reporterId: reporterId || null,
      reporterName: reporterName || 'Anonymous',
      category: category || 'General',
      description,
      status: 'pending',
    });

    await issue.save();
    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin update issue status (seen / pending / resolved)
router.patch('/issues/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['seen', 'pending', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote on issue (up or down)
router.post('/issues/:id/vote', async (req, res) => {
  try {
    const { mobileUserId, direction } = req.body;
    if (!mobileUserId || !['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'mobileUserId and valid direction (up/down) required' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Rule: Once status is resolved, voting closes
    if (issue.status === 'resolved') {
      return res.status(400).json({ error: 'Voting is closed for resolved issues' });
    }

    // Find existing vote
    const existingVote = await IssueVote.findOne({
      issueId: issue._id,
      mobileUserId,
    });

    if (existingVote) {
      if (existingVote.direction === direction) {
        // Remove vote if tapped again
        await IssueVote.deleteOne({ _id: existingVote._id });
        if (direction === 'up') issue.upvotesCount = Math.max(0, issue.upvotesCount - 1);
        if (direction === 'down') issue.downvotesCount = Math.max(0, issue.downvotesCount - 1);
      } else {
        // Change vote
        if (existingVote.direction === 'up') {
          issue.upvotesCount = Math.max(0, issue.upvotesCount - 1);
          issue.downvotesCount += 1;
        } else {
          issue.downvotesCount = Math.max(0, issue.downvotesCount - 1);
          issue.upvotesCount += 1;
        }
        existingVote.direction = direction;
        await existingVote.save();
      }
    } else {
      // New vote
      const newVote = new IssueVote({
        issueId: issue._id,
        mobileUserId,
        direction,
      });
      await newVote.save();
      if (direction === 'up') issue.upvotesCount += 1;
      if (direction === 'down') issue.downvotesCount += 1;
    }

    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. ANNOUNCEMENTS
// -------------------------------------------------------------

// Active announcements for mobile app slider
router.get('/announcements', async (req, res) => {
  try {
    const now = new Date();
    const query = {
      isActive: true,
      $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }],
      $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }],
    };

    const list = await Announcement.find(query).sort({ sortOrder: 1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin list all announcements
router.get('/admin/announcements', async (req, res) => {
  try {
    const list = await Announcement.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin create announcement
router.post('/announcements', async (req, res) => {
  try {
    const { category, title, description, imageUrl, startsAt, endsAt, sortOrder, isActive } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const item = new Announcement({
      category: category || 'notice',
      title,
      description,
      imageUrl: imageUrl || null,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin update announcement
router.put('/announcements/:id', async (req, res) => {
  try {
    const item = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin delete announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const item = await Announcement.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. MOBILE BOOKING REQUESTS
// -------------------------------------------------------------

// List mobile booking requests
router.get('/booking-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await MobileBookingRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit mobile booking request (Mobile user)
router.post('/booking-requests', async (req, res) => {
  try {
    const {
      mobileUserId,
      mobileUserName,
      contactEmail,
      roomNumber,
      roomType,
      requestedDate,
      requestedSlot,
      programName,
      description,
    } = req.body;

    if (!mobileUserId || !contactEmail || !requestedDate || !requestedSlot) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    const request = new MobileBookingRequest({
      mobileUserId,
      mobileUserName: mobileUserName || 'Mobile User',
      contactEmail,
      roomNumber: roomNumber || '3',
      roomType: roomType || 'conference',
      requestedDate: new Date(requestedDate),
      requestedSlot,
      programName: programName || 'IAC Mobile Reservation',
      description: description || '',
      status: 'pending',
    });

    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm Mobile Booking Request (Admin Action)
router.post('/booking-requests/:id/confirm', async (req, res) => {
  try {
    const request = await MobileBookingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Booking request not found' });
    }

    if (request.status === 'confirmed') {
      return res.status(400).json({ error: 'Booking request is already confirmed' });
    }

    const dateFormatted = new Date(request.requestedDate).toISOString().split('T')[0];

    // Conflict check in existing production Booking model
    const conflict = await Booking.findOne({
      roomNumber: String(request.roomNumber),
      date: dateFormatted,
      $or: [{ timeSlot: request.requestedSlot }, { timeSlots: request.requestedSlot }],
    });

    if (conflict) {
      return res.status(409).json({
        error: 'Slot conflict: Room is already booked in the primary system for this date and time slot.',
      });
    }

    // Call existing booking model creation path
    const createdBooking = new Booking({
      programName: request.programName || 'IAC Mobile Reservation',
      description: request.description || `Booked via Mobile App by ${request.mobileUserName}`,
      roomType: request.roomType || 'conference',
      roomNumber: String(request.roomNumber || '3'),
      date: dateFormatted,
      timeSlot: request.requestedSlot,
      timeSlots: [request.requestedSlot],
      bookedBy: request.mobileUserName || 'Mobile App User',
      status: 'confirmed',
    });

    await createdBooking.save();

    // Mark request confirmed & link _id
    request.status = 'confirmed';
    request.confirmedBookingId = createdBooking._id;
    await request.save();

    // Send confirmation email
    const emailResult = await sendEmail({
      to: request.contactEmail,
      subject: 'Booking Confirmed - IAC Mobile System',
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #18181b; background-color: #f8fafc; border-radius: 12px;">
          <h2 style="color: #16a34a; margin-top: 0;">Reservation Confirmed 🎉</h2>
          <p>Hello <strong>${request.mobileUserName}</strong>,</p>
          <p>Your room booking request submitted via the IAC Mobile App has been reviewed and approved by staff.</p>
          <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Program:</strong> ${request.programName}</p>
            <p style="margin: 4px 0;"><strong>Room Number:</strong> Room ${request.roomNumber}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${dateFormatted}</p>
            <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${request.requestedSlot}</p>
          </div>
          <p>We look forward to hosting you at the Information Access Center!</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">IAC Mobile System &bull; Automated Notification</p>
        </div>
      `,
    });

    res.json({
      message: 'Booking request confirmed and written to production booking system',
      bookingRequest: request,
      createdBooking,
      emailStatus: emailResult,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Mobile Booking Request (Admin Action)
router.post('/booking-requests/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await MobileBookingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Booking request not found' });
    }

    request.status = 'rejected';
    await request.save();

    const dateFormatted = new Date(request.requestedDate).toISOString().split('T')[0];

    // Send rejection email
    const emailResult = await sendEmail({
      to: request.contactEmail,
      subject: 'Booking Request Update - IAC Mobile System',
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #18181b; background-color: #f8fafc; border-radius: 12px;">
          <h2 style="color: #dc2626; margin-top: 0;">Reservation Request Declined</h2>
          <p>Hello <strong>${request.mobileUserName}</strong>,</p>
          <p>Unfortunately, your room reservation request for <strong>Room ${request.roomNumber}</strong> on <strong>${dateFormatted} (${request.requestedSlot})</strong> could not be approved at this time.</p>
          ${
            reason
              ? `<div style="background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin: 16px 0;"><strong>Reason:</strong> ${reason}</div>`
              : ''
          }
          <p>Please feel free to submit a request for an alternative date or slot in the app.</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">IAC Mobile System &bull; Automated Notification</p>
        </div>
      `,
    });

    res.json({
      message: 'Booking request rejected and user notified via email',
      bookingRequest: request,
      emailStatus: emailResult,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. SMTP SETTINGS & EMAIL TEST
// -------------------------------------------------------------

// Get SMTP config
router.get('/smtp-config', async (req, res) => {
  try {
    let config = await SmtpConfig.findOne().sort({ createdAt: -1 });
    if (!config) {
      config = new SmtpConfig({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        fromEmail: '',
        fromName: 'IAC Mobile System',
      });
      await config.save();
    }

    res.json({
      _id: config._id,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      pass: config.pass ? '••••••••' : '',
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      isConfigured: Boolean(config.user && config.pass),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update SMTP config
router.post('/smtp-config', async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromEmail, fromName } = req.body;

    let config = await SmtpConfig.findOne().sort({ createdAt: -1 });
    if (!config) {
      config = new SmtpConfig({});
    }

    if (host !== undefined) config.host = host;
    if (port !== undefined) config.port = Number(port);
    if (secure !== undefined) config.secure = Boolean(secure);
    if (user !== undefined) config.user = user;
    // Only update pass if provided and not masked
    if (pass !== undefined && pass !== '••••••••') {
      config.pass = pass;
    }
    if (fromEmail !== undefined) config.fromEmail = fromEmail;
    if (fromName !== undefined) config.fromName = fromName;

    await config.save();

    res.json({
      message: 'SMTP Configuration saved successfully',
      config: {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: config.pass ? '••••••••' : '',
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        isConfigured: Boolean(config.user && config.pass),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test SMTP config
router.post('/smtp-config/test', async (req, res) => {
  try {
    const { testEmail } = req.body;
    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    await verifyAndSendTestEmail(testEmail);
    res.json({ message: `Test email sent successfully to ${testEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Mobile User Profile / Streak
router.get('/user-profile/:mobileUserId', async (req, res) => {
  try {
    let profile = await MobileUserProfile.findOne({ mobileUserId: req.params.mobileUserId });
    if (!profile) {
      profile = new MobileUserProfile({
        mobileUserId: req.params.mobileUserId,
        streak: 0,
        totalCheckins: 0,
      });
      await profile.save();
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
