import { useState, useEffect } from 'react';
import { Coffee, Plus, Check, X, Search, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface PendingTicket {
  _id: string;
  ticketCode: string;
  status: string;
  requestedAt: string;
  user: {
    id: string;
    name: string;
    displayName: string;
    email: string;
    currentStreak: number;
  };
}

interface LoungeLog {
  _id: string;
  name: string;
  identifier: string;
  identifierType: string;
  contactNumber: string;
  gender: string;
  timeIn: string;
  timeOut?: string;
}

export default function Lounge() {
  const { showToast } = useToast();
  const [pendingQueue, setPendingQueue] = useState<PendingTicket[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const [loungeLogs, setLoungeLogs] = useState<LoungeLog[]>([]);
  const [search, setSearch] = useState('');

  // Manual Check-in Form Modal
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    user_id: '',
    user_id_type: 'ghana_card',
    contact: '',
    gender: 'male',
    user_time_in: new Date().toISOString().slice(0, 16),
  });

  const fetchPendingQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await api.get('/api/staff/checkins/pending');
      setPendingQueue(res.data);
    } catch (err) {
      console.error('Pending queue fetch error:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const fetchLoungeLogs = async () => {
    try {
      const res = await api.get('/api/users/lounge-data');
      if (res.data.data) setLoungeLogs(res.data.data);
      else if (Array.isArray(res.data)) setLoungeLogs(res.data);
    } catch (err) {
      console.error('Lounge logs fetch error:', err);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
    fetchLoungeLogs();
    const interval = setInterval(fetchPendingQueue, 8000); // Live poll queue
    return () => clearInterval(interval);
  }, []);

  const confirmTicket = async (id: string, ticketCode: string) => {
    try {
      const res = await api.post(`/api/staff/checkins/${id}/confirm`);
      showToast(`Confirmed ticket ${ticketCode}! Visitor streak is now ${res.data.updatedStreak} days.`, 'success');
      fetchPendingQueue();
      fetchLoungeLogs();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to confirm ticket', 'error');
    }
  };

  const rejectTicket = async (id: string, ticketCode: string) => {
    try {
      await api.post(`/api/staff/checkins/${id}/reject`);
      showToast(`Rejected ticket ${ticketCode}`, 'info');
      fetchPendingQueue();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reject ticket', 'error');
    }
  };

  const handleCreateLoungeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/users/lounge-data', formData);
      showToast('Lounge check-in record saved', 'success');
      setShowForm(false);
      setFormData({
        full_name: '',
        user_id: '',
        user_id_type: 'ghana_card',
        contact: '',
        gender: 'male',
        user_time_in: new Date().toISOString().slice(0, 16),
      });
      fetchLoungeLogs();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error saving lounge log', 'error');
    }
  };

  const filteredLogs = loungeLogs.filter(
    (l) =>
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.identifier?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Coffee className="w-6 h-6 text-amber-400" />
            Internet Lounge Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Live check-in ticket verification queue & staff visitor logs.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Check-in Entry</span>
        </button>
      </div>

      {/* SECTION 1: LIVE PENDING CHECK-IN TICKET QUEUE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono">
              Live Pending Desk Queue ({pendingQueue.length})
            </h2>
          </div>
          <button
            onClick={fetchPendingQueue}
            disabled={queueLoading}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No pending visitor check-in tickets at desk right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {pendingQueue.map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-xl bg-slate-800/80 border border-amber-500/30 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-base font-bold text-amber-400 tracking-wider">
                      {item.ticketCode}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-slate-100">{item.user.displayName}</p>
                    <p className="text-xs text-slate-400">{item.user.email}</p>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[11px] font-mono">
                    <span>🔥 Current Streak:</span>
                    <span className="font-bold">{item.user.currentStreak} days</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => confirmTicket(item._id, item.ticketCode)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => rejectTicket(item._id, item.ticketCode)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 rounded-lg text-xs font-medium transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: STAFF LOUNGE ENTRY LOGS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono">
            Staff Lounge Visitor Logs
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search visitor logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Visitor Name</th>
                <th className="p-3">ID Number</th>
                <th className="p-3">ID Type</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Time In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No lounge log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-100">{log.name}</td>
                    <td className="p-3 font-mono">{log.identifier}</td>
                    <td className="p-3 uppercase text-[10px] text-slate-400">{log.identifierType}</td>
                    <td className="p-3">{log.contactNumber}</td>
                    <td className="p-3 text-slate-400">{new Date(log.timeIn).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Check-in Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-100">Manual Lounge Entry</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLoungeEntry} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">ID Number</label>
                  <input
                    type="text"
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ID Type</label>
                  <select
                    value={formData.user_id_type}
                    onChange={(e) => setFormData({ ...formData, user_id_type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="ghana_card">Ghana Card</option>
                    <option value="passport">Passport</option>
                    <option value="student_id">Student ID</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
