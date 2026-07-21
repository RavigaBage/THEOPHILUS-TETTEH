const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Lounge.tsx', 'utf8');

code = code.replace(
  /<input\s+type="text"\s+name="full_name"[\s\S]*?\/>/,
  `$&
                {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="user_id"[\s\S]*?\/>/,
  `$&
                {errors.user_id && <p className="text-xs text-red-500 mt-1">{errors.user_id}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="contact"[\s\S]*?\/>/,
  `$&
                {errors.contact && <p className="text-xs text-red-500 mt-1">{errors.contact}</p>}`
);

fs.writeFileSync('frontend/src/pages/Lounge.tsx', code);
