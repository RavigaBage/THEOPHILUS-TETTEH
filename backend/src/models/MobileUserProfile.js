const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mobileUserProfileSchema = new mongoose.Schema(
  {
    mobileUserId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, default: 'Mobile Visitor' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phoneNumber: { type: String, default: '', trim: true },
    studentId: { type: String, default: '', trim: true },
    password: { type: String, select: false },
    refreshToken: { type: String, select: false },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCheckins: { type: Number, default: 0 },
    lastCheckinDate: { type: Date },
  },
  { timestamps: true }
);

mobileUserProfileSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

mobileUserProfileSchema.methods.comparePassword = async function (userPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(userPassword, this.password);
};

module.exports = mongoose.model('MobileUserProfile', mobileUserProfileSchema);
