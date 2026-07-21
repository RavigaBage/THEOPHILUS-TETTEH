const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');
code = code.replace(
  "return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});",
  "if (req.path.includes('validate')) return res.json({ success: true, data: { label: 'Mock Session', token: 'mocktoken' } }); return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});"
);
fs.writeFileSync('backend/server.js', code);
