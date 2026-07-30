const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'default_settings',
    unique: true,
  },
  smtpHost: {
    type: String,
    default: 'smtp.gmail.com',
  },
  smtpPort: {
    type: Number,
    default: 587,
  },
  smtpSecure: {
    type: Boolean,
    default: false,
  },
  smtpUser: {
    type: String,
    default: '',
  },
  smtpPass: {
    type: String,
    default: '',
  },
  fromName: {
    type: String,
    default: 'IAC System',
  },
  fromEmail: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
