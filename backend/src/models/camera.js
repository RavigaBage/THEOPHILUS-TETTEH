const mongoose = require('mongoose');

const CAMERA_STATUS = ['active', 'inactive', 'maintenance', 'offline'];
const CAMERA_TYPES = ['ip', 'analog', 'ptz', 'fisheye', 'dome'];
const LOCATIONS = [
  'internet_lounge',
  'seminar_room_1',
  'seminar_room_2',
  'conference_room_1',
  'conference_room_2',
  'entrance',
  'server_room',
  'corridor',
  'parking',
  'reception',
  'other',
];

const CameraSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Camera name is required'],
      trim: true,
      maxlength: [100, 'Camera name cannot exceed 100 characters'],
    },

    cameraCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    location: {
      type: String,
      enum: LOCATIONS,
      required: [true, 'Camera location is required'],
    },

    customLocation: {
      type: String,
      trim: true,
    },

    streamUrl: {
      type: String,
      required: [true, 'Stream URL is required'],
      trim: true,
    },

    snapshotUrl: {
      type: String,
      trim: true,
    },

    ipAddress: {
      type: String,
      trim: true,
    },

    port: {
      type: Number,
      default: 554,
    },

    cameraType: {
      type: String,
      enum: CAMERA_TYPES,
      default: 'ip',
    },

    resolution: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p', '2K', '4K'],
      default: '1080p',
    },

    status: {
      type: String,
      enum: CAMERA_STATUS,
      default: 'active',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    requiresAuth: {
      type: Boolean,
      default: false,
    },

    streamCredentials: {
      username: { type: String, select: false },
      password: { type: String, select: false },
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },

    lastChecked: {
      type: Date,
      default: Date.now,
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Iac_users',
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

CameraSchema.index({ location: 1, status: 1 });

module.exports =
  mongoose.models.Camera || mongoose.model('Camera', CameraSchema);