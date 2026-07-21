const mongoose = require('mongoose');

const FILE_CATEGORIES = [
  'document',
  'image',
  'video',
  'audio',
  'spreadsheet',
  'presentation',
  'archive',
  'other',
];

const ACCESS_LEVELS = ['admin_only', 'all_staff', 'public'];

const MediaStorageSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: FILE_CATEGORIES,
      default: 'other',
    },

    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    tags: {
      type: [String],
      default: [],
    },

    accessLevel: {
      type: String,
      enum: ACCESS_LEVELS,
      default: 'admin_only',
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Iac_users',
      required: true,
    },

    downloadCount: {
      type: Number,
      default: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Iac_users',
    },
  },
  { timestamps: true }
);

MediaStorageSchema.index({ category: 1, accessLevel: 1 });
MediaStorageSchema.index({ uploadedBy: 1 });
MediaStorageSchema.index({ tags: 1 });
MediaStorageSchema.index({ title: 'text', description: 'text', fileName: 'text' });

module.exports =
  mongoose.models.MediaStorage ||
  mongoose.model('MediaStorage', MediaStorageSchema);