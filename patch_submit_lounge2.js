const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Lounge.tsx', 'utf8');

code = code.replace(/if \(\!formData\.name\.trim\(\)\) newErrors\.name = 'Full Name is required';/, "if (!formData.full_name.trim()) newErrors.full_name = 'Full Name is required';");
code = code.replace(/if \(\!formData\.identifier\.trim\(\)\) newErrors\.identifier = 'ID Number is required';/, "if (!formData.user_id.trim()) newErrors.user_id = 'ID Number is required';");
code = code.replace(/if \(\!formData\.contactNumber\.trim\(\)\) newErrors\.contactNumber = 'Contact Number is required';/, "if (!formData.contact.trim()) newErrors.contact = 'Contact Number is required';");

code = code.replace(/\{errors\.name && <p className="text-xs text-red-500 mt-1">\{errors\.name\}<\/p>\}/, '{errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}');
code = code.replace(/\{errors\.identifier && <p className="text-xs text-red-500 mt-1">\{errors\.identifier\}<\/p>\}/, '{errors.user_id && <p className="text-xs text-red-500 mt-1">{errors.user_id}</p>}');
code = code.replace(/\{errors\.contactNumber && <p className="text-xs text-red-500 mt-1">\{errors\.contactNumber\}<\/p>\}/, '{errors.contact && <p className="text-xs text-red-500 mt-1">{errors.contact}</p>}');

fs.writeFileSync('frontend/src/pages/Lounge.tsx', code);
