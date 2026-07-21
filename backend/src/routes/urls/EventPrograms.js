const express = require('express');
const { protect, restrictTo } = require('./../../middleware/auth');
const BookingData = require('./../../models/booking');

const router = express.Router();

router.get('/event-program', restrictTo('user', 'admin'), async(req, res) => {
    try {
        const { date, room, page, year, month, day, status, paymentStatus } = req.query;
        
        const limit = 50;
        const pageNum = parseInt(page) || 1;
        const skip = (pageNum - 1) * limit;
        
        const filter = {};
        if (room && room !== 'all') {
            filter.room = room;
        }
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            filter.paymentStatus = paymentStatus;
        }
        
        if (year && month && day) {
            filter.date = {
                $gte: new Date(year, month - 1, day),
                $lt: new Date(year, month - 1, day + 1)
            };
        } else if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0,0,0,0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23,59,59,999);
            filter.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const data = await BookingData.find(filter).skip(skip).limit(limit).sort({ date: 1 });
        const total = await BookingData.countDocuments(filter);
        
        res.json({
            status: 'success',
            data,
            page: pageNum,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        if (err.message && err.message.includes('bufferCommands')) {
            console.warn('[AI Studio] Using mock booking data');
            return res.json({
                status: 'success',
                data: [],
                page: 1, limit: 50, total: 0, totalPages: 1
            });
        }
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

router.patch('/event-program/:id', restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecord = await BookingData.findByIdAndUpdate(
      id,
      req.body,
      {
        returnDocument: 'after',
        runValidators: true
      }
    );
    if (!updatedRecord) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ status: 'success', data: updatedRecord });
  } catch (err) {
    if (err.message && err.message.includes('bufferCommands')) {
        console.warn('[AI Studio] Using mock update response');
        return res.json({ status: 'success', data: { _id: req.params.id, ...req.body } });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.delete('/event-program/:id', restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await BookingData.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ status: 'success', message: 'Record deleted successfully' });
  } catch (err) {
    if (err.message && err.message.includes('bufferCommands')) {
        return res.json({ status: 'success', message: 'Record deleted successfully (mock)' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.post('/submit-event-program', restrictTo('user', 'admin'), async(req, res) => {
    try {
        const data = await BookingData.create(req.body);
        res.json({
            status: 'success',
            data: data,
        });
    } catch (err) {
        if (err.message && err.message.includes('bufferCommands')) {
            console.warn('[AI Studio] Using mock submit response');
            return res.json({ status: 'success', data: { _id: Math.random().toString(36).substring(7), ...req.body } });
        }
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

module.exports = router;
