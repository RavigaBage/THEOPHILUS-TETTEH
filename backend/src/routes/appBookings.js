const express = require('express');
const router = express.Router();
const AppBooking = require('../models/AppBooking');
const { protectAppUser, protect } = require('../middleware/auth');
const { logAudit } = require('../middleware/AuditLogger');

// Public list of bookable rooms
router.get('/rooms', (req, res) => {
  res.json([
    {
      id: 'seminar-room',
      name: 'Seminar Room',
      capacity: '24 seats',
      features: 'Projector, Whiteboard, High-speed Wi-Fi',
      image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=60&auto=format&fit=crop',
    },
    {
      id: 'conference-room',
      name: 'Conference Room',
      capacity: '12 seats',
      features: '4K Display, Video Conferencing, Audio System',
      image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600&q=60&auto=format&fit=crop',
    },
    {
      id: 'training-lab',
      name: 'Training Lab',
      capacity: '18 workstations',
      features: 'High-spec PCs, Smart Board, Korean Class Venue',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=60&auto=format&fit=crop',
    },
  ]);
});

// Check available / taken slots for a room on a given date
router.get('/rooms/:id/slots', async (req, res) => {
  try {
    const { date } = req.query;
    const roomMap = {
      'seminar-room': 'Seminar Room',
      'conference-room': 'Conference Room',
      'training-lab': 'Training Lab',
    };
    const roomName = roomMap[req.params.id] || req.params.id;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const allSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

    const existing = await AppBooking.find({
      roomName,
      date: targetDate,
      status: { $in: ['pending', 'confirmed'] },
    });

    const takenSlots = existing.map((b) => b.timeSlot);

    const slots = allSlots.map((slot) => ({
      slot,
      available: !takenSlots.includes(slot),
    }));

    res.json({
      roomName,
      date: targetDate,
      slots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch slots' });
  }
});

// Create booking request (App user)
router.post('/bookings', protectAppUser, async (req, res) => {
  try {
    const { roomName, date, timeSlot, purpose } = req.body;
    if (!roomName || !date || !timeSlot) {
      return res.status(400).json({ message: 'Room name, date, and time slot are required' });
    }

    // Double booking check
    const existing = await AppBooking.findOne({
      roomName,
      date,
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existing) {
      return res.status(400).json({ message: `The time slot ${timeSlot} on ${date} is already booked or pending approval` });
    }

    const booking = await AppBooking.create({
      userId: req.appUser._id,
      roomName,
      date,
      timeSlot,
      purpose: purpose || 'General Study / Meeting',
      status: 'pending',
    });

    res.status(201).json({
      message: 'Booking request submitted successfully! Waiting for staff approval.',
      booking,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to submit booking' });
  }
});

// App user: My bookings
router.get('/bookings/my', protectAppUser, async (req, res) => {
  try {
    const bookings = await AppBooking.find({ userId: req.appUser._id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch user bookings' });
  }
});

// STAFF: List pending room booking requests
router.get('/staff/bookings/pending', protect, async (req, res) => {
  try {
    const pending = await AppBooking.find({ status: 'pending' })
      .populate('userId', 'name email displayName isAnonymous')
      .sort({ createdAt: 1 });

    const formatted = pending.map((b) => {
      const u = b.userId || {};
      const hash = u._id ? u._id.toString().slice(-4).toUpperCase() : '0000';
      const displayName = u.isAnonymous ? `Guest #${hash}` : (u.displayName || u.name || 'Visitor');
      return {
        _id: b._id,
        roomName: b.roomName,
        date: b.date,
        timeSlot: b.timeSlot,
        purpose: b.purpose,
        status: b.status,
        createdAt: b.createdAt,
        user: {
          id: u._id,
          name: u.name,
          displayName,
          email: u.email,
        },
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch pending bookings' });
  }
});

// STAFF: Approve booking
router.post('/staff/bookings/:id/approve', protect, async (req, res) => {
  try {
    const booking = await AppBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'confirmed';
    booking.reviewedBy = req.user._id;
    booking.reviewedAt = new Date();
    await booking.save();

    await logAudit(
      'BOOKING_APPROVED',
      req.user,
      booking.userId?.toString(),
      { roomName: booking.roomName, date: booking.date, timeSlot: booking.timeSlot },
      req.ip
    );

    res.json({ message: 'Booking approved successfully', booking });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to approve booking' });
  }
});

// STAFF: Decline booking
router.post('/staff/bookings/:id/decline', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await AppBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'declined';
    booking.declineReason = reason || 'Declined by staff';
    booking.reviewedBy = req.user._id;
    booking.reviewedAt = new Date();
    await booking.save();

    await logAudit(
      'BOOKING_DECLINED',
      req.user,
      booking.userId?.toString(),
      { roomName: booking.roomName, date: booking.date, timeSlot: booking.timeSlot, reason },
      req.ip
    );

    res.json({ message: 'Booking declined', booking });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to decline booking' });
  }
});

module.exports = router;
