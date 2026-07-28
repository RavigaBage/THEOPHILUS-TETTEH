const express = require('express');
const router = express.Router();
const QRCode = require('../models/QRCode');
const InternetLounge = require('../models/InternetLounge');

// Validate QR token for public attendance form
router.get('/qrcodes/validate/:token', async (req, res) => {
  try {
    const qr = await QRCode.findOne({ token: req.params.token });
    if (!qr) {
      return res.status(404).json({ success: false, error: 'Invalid or expired QR code' });
    }
    if (new Date() > qr.expiresAt) {
      return res.status(400).json({ success: false, error: 'QR Code has expired' });
    }
    res.json({ success: true, data: { label: qr.label, token: qr.token, expiresAt: qr.expiresAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit public attendance form
router.post('/qrcodes/submit', async (req, res) => {
  try {
    const { token, fullName, idNumber, idType, contactNumber, gender, signature } = req.body;
    const qr = await QRCode.findOne({ token });
    if (!qr || new Date() > qr.expiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired session token' });
    }

    const entry = await InternetLounge.create({
      name: fullName,
      identifier: idNumber,
      identifierType: idType || 'ghana_card',
      contactNumber,
      gender: gender || 'male',
      timeIn: new Date().toISOString(),
      Signature: signature || 'Public Submission',
    });

    res.status(201).json({ success: true, message: 'Attendance recorded successfully', data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
