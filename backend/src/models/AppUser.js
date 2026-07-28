const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AppUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    displayName: {
      type: String,
      default: '',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCheckinDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

AppUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

AppUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

AppUserSchema.methods.getPublicName = function () {
  if (this.isAnonymous) {
    const hash = this._id ? this._id.toString().slice(-4).toUpperCase() : '0000';
    return `Guest #${hash}`;
  }
  return this.displayName || this.name || 'Visitor';
};

module.exports = mongoose.model('AppUser', AppUserSchema, 'app_users');
