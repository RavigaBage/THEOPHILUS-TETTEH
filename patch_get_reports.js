const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/reportController.js', 'utf8');

const oldGetAllReportsRegex = /exports\.getAllReports = async \(req, res, next\) => \{[\s\S]*?res\.status\(200\)\.json\(\{[\s\S]*?\}\);\n  \} catch \(err\) \{\n    next\(err\);\n  \}\n\};/;

const newGetAllReports = `exports.getAllReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find({ isDeleted: false })
        .populate('generatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments({ isDeleted: false }),
    ]);

    res.status(200).json({
      message: 'Reports fetched successfully.',
      pagination: {
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
        total
      },
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};`;

code = code.replace(oldGetAllReportsRegex, newGetAllReports);
fs.writeFileSync('backend/src/controllers/reportController.js', code);
