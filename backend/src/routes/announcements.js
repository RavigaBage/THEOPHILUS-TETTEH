const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { logAudit } = require('../middleware/AuditLogger');

// Public active announcements for slider
router.get('/announcements', async (req, res) => {
  try {
    const now = new Date();
    const query = {
      $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }],
      $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }],
    };

    let announcements = await Announcement.find(query)
      .sort({ sortOrder: 1, createdAt: -1 });

    // Seed default announcements if empty
    if (announcements.length === 0) {
      const defaultData = [
        {
          title: 'Korean class · beginner track',
          body: 'Tue & Thu, 5:00pm · Training lab',
          category: 'pinned',
          imageUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=60&auto=format&fit=crop',
          sortOrder: 1,
        },
        {
          title: 'Founders coffee morning',
          body: 'Sat, 9:00am · Lounge',
          category: 'event',
          imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=60&auto=format&fit=crop',
          sortOrder: 2,
        },
        {
          title: 'Maintenance notice',
          body: 'Lounge closed 6–8am for cleaning',
          category: 'notice',
          imageUrl: '',
          sortOrder: 3,
        },
        {
          title: 'Open mic night',
          body: 'Fri, 7:00pm · Conference room',
          category: 'event',
          imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=60&auto=format&fit=crop',
          sortOrder: 4,
        },
      ];
      announcements = await Announcement.insertMany(defaultData);
    }

    const formatted = announcements.map((a) => ({
      _id: a._id,
      title: a.title,
      body: a.body,
      category: a.category,
      imageUrl: a.imageUrl || null,
      sortOrder: a.sortOrder,
      createdAt: a.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch announcements' });
  }
});

// STAFF: List all announcements
router.get('/staff/announcements', protect, async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch announcements' });
  }
});

// STAFF: Create announcement
router.post('/staff/announcements', protect, upload.single('image'), async (req, res) => {
  try {
    const { title, body, category, startsAt, endsAt, sortOrder, imageUrl: textImageUrl } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    let finalImageUrl = textImageUrl || '';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    }

    const announcement = await Announcement.create({
      title,
      body,
      category: category || 'notice',
      imageUrl: finalImageUrl,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAt ? new Date(endsAt) : null,
      sortOrder: parseInt(sortOrder, 10) || 0,
      createdBy: req.user._id,
    });

    await logAudit('ANNOUNCEMENT_CREATED', req.user, announcement._id.toString(), { title }, req.ip);

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create announcement' });
  }
});

// STAFF: Update announcement
router.put('/staff/announcements/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const { title, body, category, startsAt, endsAt, sortOrder, imageUrl: textImageUrl } = req.body;
    if (title) announcement.title = title;
    if (body) announcement.body = body;
    if (category) announcement.category = category;
    if (startsAt !== undefined) announcement.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) announcement.endsAt = endsAt ? new Date(endsAt) : null;
    if (sortOrder !== undefined) announcement.sortOrder = parseInt(sortOrder, 10) || 0;

    if (req.file) {
      announcement.imageUrl = `/uploads/${req.file.filename}`;
    } else if (textImageUrl !== undefined) {
      announcement.imageUrl = textImageUrl;
    }

    await announcement.save();

    await logAudit('ANNOUNCEMENT_UPDATED', req.user, announcement._id.toString(), { title: announcement.title }, req.ip);

    res.json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update announcement' });
  }
});

// STAFF: Delete announcement
router.delete('/staff/announcements/:id', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await announcement.deleteOne();

    await logAudit('ANNOUNCEMENT_DELETED', req.user, req.params.id, { title: announcement.title }, req.ip);

    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete announcement' });
  }
});

module.exports = router;
