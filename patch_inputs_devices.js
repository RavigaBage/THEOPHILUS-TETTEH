const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Devices.tsx', 'utf8');

// replace 
code = code.replace(
  /<input\s+type="text"\s+name="deviceName"[\s\S]*?\/>/,
  `$&
                {errors.deviceName && <p className="text-xs text-red-500 mt-1">{errors.deviceName}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="ipAddress"[\s\S]*?\/>/,
  `$&
                {errors.ipAddress && <p className="text-xs text-red-500 mt-1">{errors.ipAddress}</p>}`
);

fs.writeFileSync('frontend/src/pages/Devices.tsx', code);
