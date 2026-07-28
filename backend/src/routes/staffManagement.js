const express = require('express');
const router = express.Router();
const InternetLounge = require('../models/InternetLounge');
const EventProgram = require('../models/booking');
const QRCode = require('../models/QRCode');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');

// Lounge Data CRUD
router.get('/users/lounge-data', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await InternetLounge.countDocuments();
    const data = await InternetLounge.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

    res.json({
      data,
      total,
      pages: Math.ceil(total / limit) || 1,
      page,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/users/lounge-data', protect, async (req, res) => {
  try {
    const { full_name, user_id, user_id_type, contact, gender, user_time_in, user_time_out } = req.body;
    const entry = await InternetLounge.create({
      name: full_name,
      identifier: user_id,
      identifierType: user_id_type || 'ghana_card',
      contactNumber: contact,
      gender: gender || 'male',
      timeIn: user_time_in || new Date().toISOString(),
      timeOut: user_time_out || '',
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/lounge-data/:id', protect, async (req, res) => {
  try {
    const { full_name, user_id, user_id_type, contact, gender, user_time_in, user_time_out } = req.body;
    const entry = await InternetLounge.findByIdAndUpdate(
      req.params.id,
      {
        name: full_name,
        identifier: user_id,
        identifierType: user_id_type,
        contactNumber: contact,
        gender,
        timeIn: user_time_in,
        timeOut: user_time_out,
      },
      { new: true }
    );
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/users/lounge-data/:id', protect, async (req, res) => {
  try {
    await InternetLounge.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Event Programs CRUD (Staff Room Bookings)
router.get('/events', protect, async (req, res) => {
  try {
    const events = await EventProgram.find({ isDeleted: false }).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/events', protect, async (req, res) => {
  try {
    const event = await EventProgram.create({
      ...req.body,
      createdBy: req.user.name,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/events/:id', protect, async (req, res) => {
  try {
    const event = await EventProgram.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/events/:id', protect, async (req, res) => {
  try {
    await EventProgram.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: 'Event program deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Audit Logs
router.get('/audit-logs', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
