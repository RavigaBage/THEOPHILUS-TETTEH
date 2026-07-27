const path = require('path');
const fs = require('fs');
const MediaStorage = require('../models/MediaStorage');
const { logAudit } = require('../middleware/auditLogger');
const { getCategoryFromMime, buildFileUrl, BASE_UPLOAD_DIR } = require('../middleware/upload');

exports.uploadFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }

    const { title, description, accessLevel, tags } = req.body;
    const parsedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()))
      : [];

    const savedFiles = await Promise.all(
      req.files.map(async (file) => {
        const fileUrl = buildFileUrl(req, file.path);
        const category = getCategoryFromMime(file.mimetype);

        const media = await MediaStorage.create({
          fileName: file.filename,
          originalName: file.originalname,
          fileType: path.extname(file.originalname).toLowerCase().replace('.', ''),
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
          fileUrl,
          category,
          title: title || file.originalname,
          description,
          tags: parsedTags,
          accessLevel: accessLevel || 'admin_only',
          uploadedBy: req.user._id,
        });

        return media;
      })
    );

    await logAudit({
      action: 'UPLOAD',
      resourceType: 'MediaStorage',
      req,
      details: {
        fileCount: savedFiles.length,
        files: savedFiles.map((f) => ({ id: f._id, name: f.originalName, size: f.fileSize })),
      },
    });

    res.status(201).json({
      message: `${savedFiles.length} file(s) uploaded successfully.`,
      data: savedFiles,
    });
  } catch (err) {
    next(err);
  }
};


exports.getAllMedia = async (req, res, next) => {
  try {
    const {
      category,
      accessLevel,
      uploadedBy,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = { isDeleted: false };
    if (category) filter.category = category;
    if (accessLevel) filter.accessLevel = accessLevel;
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [files, total] = await Promise.all([
      MediaStorage.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      MediaStorage.countDocuments(filter),
    ]);

    res.status(200).json({
      message: 'Media files fetched.',
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: files,
    });
  } catch (err) {
    next(err);
  }
};


exports.getMediaById = async (req, res, next) => {
  try {
    const media = await MediaStorage.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate('uploadedBy', 'name email');

    if (!media) {
      return res.status(404).json({ message: 'File not found.' });
    }

    res.status(200).json({ message: 'File fetched.', data: media });
  } catch (err) {
    next(err);
  }
};


exports.downloadMedia = async (req, res, next) => {
  try {
    const media = await MediaStorage.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!media) {
      return res.status(404).json({ message: 'File not found.' });
    }

    if (!fs.existsSync(media.filePath)) {
      return res.status(410).json({ message: 'File no longer exists on server.' });
    }

    media.downloadCount += 1;
    await media.save();

    await logAudit({
      action: 'DOWNLOAD',
      resourceType: 'MediaStorage',
      resourceId: media._id,
      req,
      details: { fileName: media.originalName, category: media.category },
    });

    res.download(media.filePath, media.originalName);
  } catch (err) {
    next(err);
  }
};


exports.updateMedia = async (req, res, next) => {
  try {
    const media = await MediaStorage.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!media) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const { title, description, accessLevel, tags, category } = req.body;

    if (title !== undefined) media.title = title;
    if (description !== undefined) media.description = description;
    if (accessLevel !== undefined) media.accessLevel = accessLevel;
    if (category !== undefined) media.category = category;
    if (tags !== undefined) {
      media.tags = Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim());
    }

    await media.save();

    await logAudit({
      action: 'UPDATE',
      resourceType: 'MediaStorage',
      resourceId: media._id,
      req,
      details: { updatedFields: Object.keys(req.body) },
    });

    res.status(200).json({ message: 'File metadata updated.', data: media });
  } catch (err) {
    next(err);
  }
};


exports.deleteMedia = async (req, res, next) => {
  try {
    const media = await MediaStorage.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!media) {
      return res.status(404).json({ message: 'File not found.' });
    }

    media.isDeleted = true;
    media.deletedAt = new Date();
    media.deletedBy = req.user._id;
    await media.save();

    await logAudit({
      action: 'DELETE',
      resourceType: 'MediaStorage',
      resourceId: media._id,
      req,
      details: { fileName: media.originalName, category: media.category },
    });

    res.status(200).json({ message: 'File deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getMediaStats = async (req, res, next) => {
  try {
    const [byCategory, byAccessLevel, totalSizeAgg, topDownloaded, recentUploads] =
      await Promise.all([
        MediaStorage.aggregate([
          { $match: { isDeleted: false } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalSize: { $sum: '$fileSize' },
            },
          },
          { $sort: { count: -1 } },
        ]),

        MediaStorage.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$accessLevel', count: { $sum: 1 } } },
        ]),

        MediaStorage.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: null, totalSize: { $sum: '$fileSize' }, totalFiles: { $sum: 1 } } },
        ]),

        MediaStorage.find({ isDeleted: false })
          .sort({ downloadCount: -1 })
          .limit(5)
          .select('originalName category downloadCount fileSize fileUrl'),

        MediaStorage.find({ isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('originalName category fileSize fileUrl createdAt uploadedBy')
          .populate('uploadedBy', 'name'),
      ]);

    res.status(200).json({
      message: 'Media stats fetched.',
      data: {
        byCategory,
        byAccessLevel,
        totals: totalSizeAgg[0] || { totalSize: 0, totalFiles: 0 },
        topDownloaded,
        recentUploads,
      },
    });
  } catch (err) {
    next(err);
  }
};