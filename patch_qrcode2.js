const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/qrCodeController.js', 'utf8');

const replacement = `exports.getQRSubmissions = async (req, res, next) => {
  try {
    const { token } = req.params;
    const submissions = await InternetLounge.find({ qrToken: token }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};`;

code = code.replace(/exports\.getQRSubmissions = async \(req, res, next\) => \{[\s\S]*?\};/, replacement);
fs.writeFileSync('backend/src/controllers/qrCodeController.js', code);
