  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.deviceName.trim()) newErrors.deviceName = 'Device Name is required';
    if (!formData.ipAddress.trim()) newErrors.ipAddress = 'Identifier is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
