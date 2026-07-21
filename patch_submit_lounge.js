const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Lounge.tsx', 'utf8');

const newSubmit = `  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full Name is required';
    if (!formData.identifier.trim()) newErrors.identifier = 'ID Number is required';
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact Number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);`;

code = code.replace(/const handleSubmit = async \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n    try \{\n      setSubmitting\(true\);/, newSubmit);
fs.writeFileSync('frontend/src/pages/Lounge.tsx', code);
