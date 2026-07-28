import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';
import api from '../lib/api';

export default function AttendanceForm() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [, setValid] = useState<boolean | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    idType: 'ghana_card',
    contactNumber: '',
    gender: 'male',
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      validateToken(token);
    }
  }, [token]);

  const validateToken = async (t: string) => {
    try {
      const res = await api.get(`/api/public/qrcodes/validate/${t}`);
      if (res.data.success) {
        setValid(true);
        setSessionInfo(res.data.data);
        setError('');
      } else {
        setValid(false);
        setError(res.data.error || 'Invalid QR code');
      }
    } catch (err: any) {
      setValid(false);
      setError(err.response?.data?.error || 'Failed to validate QR token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/public/qrcodes/submit', {
        token,
        ...formData,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit attendance');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Attendance Recorded!</h2>
          <p className="text-xs text-slate-400">
            Thank you for signing in at the Information & Access Center.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-center">IAC Kiosk Visitor Attendance</h1>
          {sessionInfo && (
            <p className="text-xs text-emerald-400 text-center font-mono mt-1">
              Session: {sessionInfo.label}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!tokenFromUrl && (
            <div>
              <label className="block text-slate-400 mb-1">QR Kiosk Token Code</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">ID Number</label>
              <input
                type="text"
                required
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">ID Type</label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100"
              >
                <option value="ghana_card">Ghana Card</option>
                <option value="passport">Passport</option>
                <option value="student_id">Student ID</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg mt-4"
          >
            <Send className="w-4 h-4" />
            <span>Submit Attendance Entry</span>
          </button>
        </form>
      </div>
    </div>
  );
}
