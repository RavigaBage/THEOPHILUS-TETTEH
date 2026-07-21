  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.organizer.trim()) newErrors.organizer = 'Organizer is required';
    if (!formData.presenter.trim()) newErrors.presenter = 'Presenter is required';
    if (!formData.programName.trim()) newErrors.programName = 'Program Name is required';
    if (!formData.participants || formData.participants < 1) newErrors.participants = 'Must be at least 1';
    if (!formData.beneficiaries || formData.beneficiaries.length === 0) newErrors.beneficiaries = 'Select at least one beneficiary';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
