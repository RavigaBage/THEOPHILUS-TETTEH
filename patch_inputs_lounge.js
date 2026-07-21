const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Lounge.tsx', 'utf8');

code = code.replace(
  /<input\s+type="text"\s+name="name"[\s\S]*?\/>/,
  `$&
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="identifier"[\s\S]*?\/>/,
  `$&
                {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="contactNumber"[\s\S]*?\/>/,
  `$&
                {errors.contactNumber && <p className="text-xs text-red-500 mt-1">{errors.contactNumber}</p>}`
);

fs.writeFileSync('frontend/src/pages/Lounge.tsx', code);
