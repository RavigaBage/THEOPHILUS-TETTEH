const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/protected.js', 'utf8');
code = code.replace(
  "const MediaRouter = require('./urls/media');",
  "const MediaRouter = require('./urls/media');\nconst QRCodeRouter = require('./urls/qrcodes');"
);
code = code.replace(
  "router.use('/media', MediaRouter);",
  "router.use('/media', MediaRouter);\n    router.use('/qrcodes', QRCodeRouter);"
);
fs.writeFileSync('backend/src/routes/protected.js', code);

let serverCode = fs.readFileSync('backend/server.js', 'utf8');
serverCode = serverCode.replace(
  "app.use('/api', createProtectedRoutes(commandService));",
  "app.use('/api/public', require('./src/routes/public'));\napp.use('/api', createProtectedRoutes(commandService));"
);
fs.writeFileSync('backend/server.js', serverCode);
