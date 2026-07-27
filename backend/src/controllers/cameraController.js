const Camera = require('../models/Camera');
const { logAudit } = require('../middleware/auditLogger');


exports.addCamera = async (req, res, next) => {
  try {
    const {
      name,
      cameraCode,
      location,
      customLocation,
      streamUrl,
      snapshotUrl,
      ipAddress,
      port,
      cameraType,
      resolution,
      requiresAuth,
      streamCredentials,
      description,
    } = req.body;

    const existingCode = await Camera.findOne({ cameraCode: cameraCode?.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ message: 'Camera code already exists.' });
    }

    const camera = await Camera.create({
      name,
      cameraCode: cameraCode?.toUpperCase(),
      location,
      customLocation,
      streamUrl,
      snapshotUrl,
      ipAddress,
      port,
      cameraType,
      resolution,
      requiresAuth,
      streamCredentials,
      description,
      addedBy: req.user._id,
    });

    await logAudit({
      action: 'CREATE',
      resourceType: 'Camera',
      resourceId: camera._id,
      req,
      details: { cameraCode: camera.cameraCode, location: camera.location },
    });

    res.status(201).json({ message: 'Camera added successfully.', data: camera });
  } catch (err) {
    next(err);
  }
};


exports.getAllCameras = async (req, res, next) => {
  try {
    const { status, location, isActive } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (location) filter.location = location;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const cameras = await Camera.find(filter)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });

    await logAudit({
      action: 'ACCESS_CAMERA',
      resourceType: 'Camera',
      req,
      details: { filters: req.query, count: cameras.length },
    });

    res.status(200).json({
      message: 'Cameras fetched successfully.',
      count: cameras.length,
      data: cameras,
    });
  } catch (err) {
    next(err);
  }
};


exports.getCameraById = async (req, res, next) => {
  try {
    const camera = await Camera.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate('addedBy', 'name email');

    if (!camera) {
      return res.status(404).json({ message: 'Camera not found.' });
    }

    await logAudit({
      action: 'ACCESS_CAMERA',
      resourceType: 'Camera',
      resourceId: camera._id,
      req,
      details: { cameraCode: camera.cameraCode },
    });

    res.status(200).json({ message: 'Camera fetched.', data: camera });
  } catch (err) {
    next(err);
  }
};


exports.updateCamera = async (req, res, next) => {
  try {
    const camera = await Camera.findOne({ _id: req.params.id, isDeleted: false });
    if (!camera) {
      return res.status(404).json({ message: 'Camera not found.' });
    }

    const allowedFields = [
      'name', 'location', 'customLocation', 'streamUrl',
      'snapshotUrl', 'ipAddress', 'port', 'cameraType',
      'resolution', 'status', 'isActive', 'requiresAuth',
      'streamCredentials', 'description',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        camera[field] = req.body[field];
      }
    });

    camera.lastChecked = new Date();
    await camera.save();

    await logAudit({
      action: 'UPDATE',
      resourceType: 'Camera',
      resourceId: camera._id,
      req,
      details: { updatedFields: Object.keys(req.body) },
    });

    res.status(200).json({ message: 'Camera updated successfully.', data: camera });
  } catch (err) {
    next(err);
  }
};


exports.toggleCameraStatus = async (req, res, next) => {
  try {
    const camera = await Camera.findOne({ _id: req.params.id, isDeleted: false });
    if (!camera) {
      return res.status(404).json({ message: 'Camera not found.' });
    }

    camera.isActive = !camera.isActive;
    camera.status = camera.isActive ? 'active' : 'inactive';
    camera.lastChecked = new Date();
    await camera.save();

    await logAudit({
      action: 'STATUS_CHANGE',
      resourceType: 'Camera',
      resourceId: camera._id,
      req,
      details: { newStatus: camera.status, isActive: camera.isActive },
    });

    res.status(200).json({
      message: `Camera ${camera.isActive ? 'activated' : 'deactivated'}.`,
      data: { isActive: camera.isActive, status: camera.status },
    });
  } catch (err) {
    next(err);
  }
};


exports.deleteCamera = async (req, res, next) => {
  try {
    const camera = await Camera.findOne({ _id: req.params.id, isDeleted: false });
    if (!camera) {
      return res.status(404).json({ message: 'Camera not found.' });
    }

    camera.isDeleted = true;
    camera.isActive = false;
    camera.status = 'offline';
    await camera.save();

    await logAudit({
      action: 'DELETE',
      resourceType: 'Camera',
      resourceId: camera._id,
      req,
      details: { cameraCode: camera.cameraCode, location: camera.location },
    });

    res.status(200).json({ message: 'Camera removed successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getCamerasGrouped = async (req, res, next) => {
  try {
    const grouped = await Camera.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$location',
          cameras: {
            $push: {
              _id: '$_id',
              name: '$name',
              cameraCode: '$cameraCode',
              streamUrl: '$streamUrl',
              snapshotUrl: '$snapshotUrl',
              status: '$status',
              isActive: '$isActive',
              resolution: '$resolution',
              cameraType: '$cameraType',
              lastChecked: '$lastChecked',
            },
          },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      message: 'Cameras grouped by location.',
      data: grouped,
    });
  } catch (err) {
    next(err);
  }
};