const Report = require('../models/Reports');
const EventProgram = require('../models/booking'); // your existing model
const InternetLounge = require('../models/internetLounge');
const Device = require('../models/devices');
const { logAudit } = require('../middleware/auditLogger');


const buildDateFilter = (from, to, field = 'createdAt') => ({
  [field]: {
    $gte: new Date(from),
    $lte: new Date(to),
  },
});


exports.generateLoungeReport = async (req, res, next) => {
  try {
    const { title, description, from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: 'Date range (from, to) is required.' });
    }

    const dateFilter = buildDateFilter(from, to);

    const [
      totalVisitors,
      genderBreakdown,
      identifierTypeBreakdown,
      visitsByDay,
      recentVisitors,
    ] = await Promise.all([
      InternetLounge.countDocuments(dateFilter),

      InternetLounge.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      InternetLounge.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$identifierType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      InternetLounge.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      InternetLounge.find(dateFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select('name identifier identifierType contactNumber gender timeIn timeOut createdAt'),
    ]);

    const report = await Report.create({
      title: title || `Internet Lounge Report — ${from} to ${to}`,
      reportType: 'internet_lounge',
      description,
      dateRange: { from: new Date(from), to: new Date(to) },
      summary: {
        totalRecords: totalVisitors,
        totalVisitors,
      },
      chartData: {
        genderBreakdown,
        identifierTypeBreakdown,
        visitsByDay,
      },
      tableData: recentVisitors,
      status: 'completed',
      generatedBy: req.user._id,
    });

    await logAudit({
      action: 'GENERATE_REPORT',
      resourceType: 'Report',
      resourceId: report._id,
      req,
      details: { reportType: 'internet_lounge', from, to },
    });

    res.status(201).json({ message: 'Lounge report generated.', data: report });
  } catch (err) {
    next(err);
  }
};

exports.generateRoomsReport = async (req, res, next) => {
  try {
    const { title, description, from, to, roomType, roomNumber } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: 'Date range (from, to) is required.' });
    }

    const matchFilter = {
      ...buildDateFilter(from, to),
      isDeleted: false,
    };

    if (roomType) matchFilter.roomType = roomType;
    if (roomNumber) matchFilter.roomNumber = Number(roomNumber);

    const [
      totalEvents,
      totalParticipants,
      eventsByType,
      eventsByCategory,
      eventsByBeneficiary,
      roomUsage,
      statusBreakdown,
      eventsByDay,
      recentEvents,
    ] = await Promise.all([
      EventProgram.countDocuments(matchFilter),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, total: { $sum: '$participants' } } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$eventType', count: { $sum: 1 }, participants: { $sum: '$participants' } } },
        { $sort: { count: -1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$category', count: { $sum: 1 }, participants: { $sum: '$participants' } } },
        { $sort: { count: -1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$beneficiaries', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { roomType: '$roomType', roomNumber: '$roomNumber' },
            events: { $sum: 1 },
            participants: { $sum: '$participants' },
          },
        },
        { $sort: { '_id.roomNumber': 1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            events: { $sum: 1 },
            participants: { $sum: '$participants' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      EventProgram.find(matchFilter)
        .sort({ date: -1 })
        .limit(50)
        .select('name date organizer presenter programName participants eventType category beneficiaries roomNumber roomType status'),
    ]);

    const participantsTotal = totalParticipants[0]?.total || 0;

    const report = await Report.create({
      title: title || `Rooms Report — ${from} to ${to}`,
      reportType: roomType === 'seminar' ? 'seminar_rooms' : roomType === 'conference' ? 'conference_rooms' : 'seminar_rooms',
      description,
      dateRange: { from: new Date(from), to: new Date(to) },
      filters: { roomType, roomNumber },
      summary: {
        totalRecords: totalEvents,
        totalEvents,
        totalParticipants: participantsTotal,
      },
      chartData: {
        eventsByType,
        eventsByCategory,
        eventsByBeneficiary,
        roomUsage,
        statusBreakdown,
        eventsByDay,
      },
      tableData: recentEvents,
      status: 'completed',
      generatedBy: req.user._id,
    });

    await logAudit({
      action: 'GENERATE_REPORT',
      resourceType: 'Report',
      resourceId: report._id,
      req,
      details: { reportType: 'rooms', from, to, roomType, roomNumber },
    });

    res.status(201).json({ message: 'Rooms report generated.', data: report });
  } catch (err) {
    next(err);
  }
};

exports.generateTrainingReport = async (req, res, next) => {
  try {
    const { title, description, from, to, category } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: 'Date range (from, to) is required.' });
    }

    const matchFilter = {
      ...buildDateFilter(from, to),
      eventType: { $in: ['it training', 'workshop', 'teaching'] },
      isDeleted: false,
    };

    if (category) matchFilter.category = category;

    const [
      totalTrainings,
      totalParticipants,
      byCategory,
      byBeneficiary,
      byEventType,
      trainingsByDay,
      topOrganizers,
      recentTrainings,
    ] = await Promise.all([
      EventProgram.countDocuments(matchFilter),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, total: { $sum: '$participants' } } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$category', count: { $sum: 1 }, participants: { $sum: '$participants' } } },
        { $sort: { count: -1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$beneficiaries', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$eventType', count: { $sum: 1 }, participants: { $sum: '$participants' } } },
        { $sort: { count: -1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            events: { $sum: 1 },
            participants: { $sum: '$participants' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      EventProgram.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$organizer', count: { $sum: 1 }, participants: { $sum: '$participants' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      EventProgram.find(matchFilter)
        .sort({ date: -1 })
        .limit(50)
        .select('name date organizer presenter programName participants category eventType beneficiaries roomNumber roomType status'),
    ]);

    const participantsTotal = totalParticipants[0]?.total || 0;

    const report = await Report.create({
      title: title || `Training Rooms Report — ${from} to ${to}`,
      reportType: 'training_rooms',
      description,
      dateRange: { from: new Date(from), to: new Date(to) },
      filters: { category },
      summary: {
        totalRecords: totalTrainings,
        totalEvents: totalTrainings,
        totalParticipants: participantsTotal,
      },
      chartData: {
        byCategory,
        byBeneficiary,
        byEventType,
        trainingsByDay,
        topOrganizers,
      },
      tableData: recentTrainings,
      status: 'completed',
      generatedBy: req.user._id,
    });

    await logAudit({
      action: 'GENERATE_REPORT',
      resourceType: 'Report',
      resourceId: report._id,
      req,
      details: { reportType: 'training_rooms', from, to },
    });

    res.status(201).json({ message: 'Training report generated.', data: report });
  } catch (err) {
    next(err);
  }
};

exports.generateCenterReport = async (req, res, next) => {
  try {
    const { title, description, from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: 'Date range (from, to) is required.' });
    }

    const eventFilter = { ...buildDateFilter(from, to), isDeleted: false };
    const loungeFilter = buildDateFilter(from, to);
    const deviceFilter = buildDateFilter(from, to);

    const [
      totalVisitors,
      totalEvents,
      totalParticipantsAgg,
      activeDevices,
      offlineDevices,
      eventsByRoomType,
      eventsByCategory,
      devicesByRisk,
      visitsByDay,
      eventsByDay,
    ] = await Promise.all([
      InternetLounge.countDocuments(loungeFilter),
      EventProgram.countDocuments(eventFilter),

      EventProgram.aggregate([
        { $match: eventFilter },
        { $group: { _id: null, total: { $sum: '$participants' } } },
      ]),

      Device.countDocuments({ 'status.remoteAgent': 'active' }),
      Device.countDocuments({ 'status.remoteAgent': 'offline' }),

      EventProgram.aggregate([
        { $match: eventFilter },
        { $group: { _id: '$roomType', count: { $sum: 1 }, participants: { $sum: '$participants' } } },
      ]),

      EventProgram.aggregate([
        { $match: eventFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      Device.aggregate([
        { $group: { _id: '$security.riskLevel', count: { $sum: 1 } } },
      ]),

      InternetLounge.aggregate([
        { $match: loungeFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            visitors: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      EventProgram.aggregate([
        { $match: eventFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            events: { $sum: 1 },
            participants: { $sum: '$participants' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const report = await Report.create({
      title: title || `Center Overview — ${from} to ${to}`,
      reportType: 'center_overview',
      description,
      dateRange: { from: new Date(from), to: new Date(to) },
      summary: {
        totalVisitors,
        totalEvents,
        totalParticipants: totalParticipantsAgg[0]?.total || 0,
        activeDevices,
      },
      chartData: {
        eventsByRoomType,
        eventsByCategory,
        devicesByRisk,
        visitsByDay,
        eventsByDay,
        deviceSummary: { active: activeDevices, offline: offlineDevices },
      },
      tableData: {},
      status: 'completed',
      generatedBy: req.user._id,
    });

    await logAudit({
      action: 'GENERATE_REPORT',
      resourceType: 'Report',
      resourceId: report._id,
      req,
      details: { reportType: 'center_overview', from, to },
    });

    res.status(201).json({ message: 'Center overview report generated.', data: report });
  } catch (err) {
    next(err);
  }
};



// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a start/end Date range from a "YYYY-MM-DD" string (or today).
 */
function buildDayRange(dateStr) {
  const base = dateStr ? new Date(dateStr) : new Date();

  // Start of month
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  // End of month
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };

}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * GET /api/reports
 *
 * Query params:
 *   date        – YYYY-MM-DD  (defaults to today)
 *   status      – filter EventProgram by room status
 *   eventType   – filter EventProgram by event type
 *   category    – filter EventProgram by category
 *   roomNumber  – filter EventProgram by room (1-4)
 *   page        – pagination page (default 1)
 *   limit       – items per page (default 20)
 */
exports.getAllReports = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      reportType
    } = req.query;

    const filter = { isDeleted: false };
    if (reportType && reportType !== 'All') {
      filter.reportType = reportType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('generatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(filter),
    ]);

    res.status(200).json({
      message: 'Reports fetched successfully.',
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllReportsExcel = async (req, res, next) => {
  try {
    const {
      date,
      page = 1,
      limit = 20,
    } = req.query;

    const base = date ? new Date(date) : new Date();

    // 🗓️ Month range
    const startOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // 📅 Generate all days in month
    const days = [];
    const cursor = new Date(startOfMonth);

    while (cursor <= endOfMonth) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const dailyReports = await Promise.all(
      days.map(async (day) => {
        const start = new Date(day);
        start.setHours(0,0,0,0);
        const end = new Date(day);
        end.setHours(23,59,59,999);

        const roomFilter = { isDeleted: false, date: { $gte: start, $lte: end } };
        const loungeFilter = { createdAt: { $gte: start, $lte: end } };

        const totalRoomsDay = await EventProgram.countDocuments(roomFilter);
        const totalLoungeUsersDay = await InternetLounge.countDocuments(loungeFilter);
        const roomsDayDetails = await EventProgram.find(roomFilter)
          .select('name date organizer presenter programName participants eventType category beneficiaries roomNumber roomType')
          .lean();

        return {
          date: start.toISOString().slice(0,10),
          total_rooms_used: totalRoomsDay,
          total_lounge_users: totalLoungeUsersDay,
          rooms: roomsDayDetails,
        };
      })
    );

    const monthlyTotals = dailyReports.reduce(
      (acc, day) => {
        acc.totalLoungeUsers += day.total_lounge_users;
        acc.totalRoomUsage += day.total_rooms_used;
        acc.details = [];
        if (Array.isArray(day.rooms) && day.rooms.length) {
          acc.details.push(...day.rooms);
        }
        return acc;
      },
      {
        totalLoungeUsers: 0,
        totalRoomUsage: 0,
      }
    );

    const skip = (Number(page) - 1) * Number(limit);
    const paginated = dailyReports.slice(skip, skip + Number(limit));

    res.status(200).json({
      message: "Monthly report generated successfully.",
      
      summary: {
        month: startOfMonth.toISOString().slice(0, 7),
        totals: monthlyTotals,
      },

      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(dailyReports.length / Number(limit)),
      },

      data: paginated,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/summary
 *
 * Lightweight summary only — no paginated records.
 * Useful for dashboard stats cards.
 *
 * Query params:
 *   date – YYYY-MM-DD (defaults to today)
 */
exports.getReportSummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const { start, end } = buildDayRange(date);

    const roomFilter    = { isDeleted: false, date: { $gte: start, $lte: end } };
    const loungeFilter  = { createdAt: { $gte: start, $lte: end } };

    const [
      totalRoomBookings,
      totalLoungeUsers,
      roomUsageBreakdown,
      eventTypeBreakdown,
      statusBreakdown,
    ] = await Promise.all([
      EventProgram.countDocuments(roomFilter),
      InternetLounge.countDocuments(loungeFilter),

      EventProgram.aggregate([
        { $match: roomFilter },
        {
          $group: {
            _id: '$roomNumber',
            bookings: { $sum: 1 },
            totalParticipants: { $sum: '$participants' },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { roomNumber: '$_id', bookings: 1, totalParticipants: 1, _id: 0 } },
      ]),

      EventProgram.aggregate([
        { $match: roomFilter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { eventType: '$_id', count: 1, _id: 0 } },
      ]),

      EventProgram.aggregate([
        { $match: roomFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const totalParticipants = roomUsageBreakdown.reduce(
      (sum, r) => sum + r.totalParticipants, 0
    );

    res.status(200).json({
      message: 'Summary fetched successfully.',
      date: start.toISOString().slice(0, 10),
      summary: {
        totalRoomBookings,
        totalLoungeUsers,
        totalParticipants,
        byRoom: roomUsageBreakdown,
        byEventType: eventTypeBreakdown,
        byStatus: statusBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getReportById = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, isDeleted: false })
      .populate('generatedBy', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    await logAudit({
      action: 'READ',
      resourceType: 'Report',
      resourceId: report._id,
      req,
      details: { reportType: report.reportType },
    });

    res.status(200).json({ message: 'Report fetched.', data: report });
  } catch (err) {
    next(err);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, isDeleted: false });
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    report.isDeleted = true;
    await report.save();

    await logAudit({
      action: 'DELETE',
      resourceType: 'Report',
      resourceId: report._id,
      req,
      details: { reportType: report.reportType, title: report.title },
    });

    res.status(200).json({ message: 'Report deleted.' });
  } catch (err) {
    next(err);
  }
};

const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      action,
      resourceType,
      performedBy,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (performedBy) filter.performedBy = performedBy;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      message: 'Audit logs fetched.',
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: logs,
    });
  } catch (err) {
    next(err);
  }
};