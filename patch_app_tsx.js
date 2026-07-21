const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.tsx', 'utf8');

code = code.replace(
  "import Reports from './pages/Reports';",
  "import Reports from './pages/Reports';\nimport AttendanceQR from './pages/AttendanceQR';\nimport AttendanceForm from './pages/AttendanceForm';"
);

code = code.replace(
  '<Route path="reports" element={<Reports />} />',
  '<Route path="reports" element={<Reports />} />\n        <Route path="attendance-qr" element={<AttendanceQR />} />'
);

code = code.replace(
  '<Route path="/" element={<DashboardLayout />}>',
  '<Route path="/attendance/:token" element={<AttendanceForm />} />\n      <Route path="/" element={<DashboardLayout />}>'
);

fs.writeFileSync('frontend/src/App.tsx', code);
