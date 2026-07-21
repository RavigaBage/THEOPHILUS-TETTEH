const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Rooms.tsx', 'utf8');

// replace 
code = code.replace(
  /<input\s+type="date"\s+name="date"[\s\S]*?\/>/,
  `$&
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="organizer"[\s\S]*?\/>/,
  `$&
                {errors.organizer && <p className="text-xs text-red-500 mt-1">{errors.organizer}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="presenter"[\s\S]*?\/>/,
  `$&
                {errors.presenter && <p className="text-xs text-red-500 mt-1">{errors.presenter}</p>}`
);

code = code.replace(
  /<input\s+type="text"\s+name="programName"[\s\S]*?\/>/,
  `$&
                {errors.programName && <p className="text-xs text-red-500 mt-1">{errors.programName}</p>}`
);

code = code.replace(
  /<input\s+type="number"\s+name="participants"[\s\S]*?\/>/,
  `$&
                {errors.participants && <p className="text-xs text-red-500 mt-1">{errors.participants}</p>}`
);

code = code.replace(
  /<p className="text-xs text-zinc-500 mt-1">Hold Ctrl \(Windows\) or Cmd \(Mac\) to select multiple<\/p>/,
  `$&
                {errors.beneficiaries && <p className="text-xs text-red-500 mt-1">{errors.beneficiaries}</p>}`
);

fs.writeFileSync('frontend/src/pages/Rooms.tsx', code);
