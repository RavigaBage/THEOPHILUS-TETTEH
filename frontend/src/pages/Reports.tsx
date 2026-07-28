import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Image, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: string;
  imageUrl?: string;
  sortOrder: number;
}

interface IssueItem {
  _id: string;
  category: string;
  description: string;
  status: string;
  upvotes: number;
  downvotes: number;
  resolutionNotes?: string;
  reporterId?: {
    _id: string;
    displayName: string;
    email: string;
    currentStreak: number;
  };
}

interface AuditLogItem {
  _id: string;
  action: string;
  performedBy: string;
  createdAt: string;
}

export default function Reports() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'announcements' | 'issues' | 'audit'>('announcements');

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceForm, setAnnounceForm] = useState({
    title: '',
    body: '',
    category: 'notice',
    imageUrl: '',
    sortOrder: 1,
  });

  // Issues state
  const [issues, setIssues] = useState<IssueItem[]>([]);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/api/staff/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await api.get('/api/staff/issues');
      setIssues(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/api/staff/audit-logs');
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchIssues();
    fetchAuditLogs();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/staff/announcements', announceForm);
      showToast('Announcement published to slider board', 'success');
      setShowAnnounceModal(false);
      setAnnounceForm({ title: '', body: '', category: 'notice', imageUrl: '', sortOrder: 1 });
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error creating announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await api.delete(`/api/staff/announcements/${id}`);
      showToast('Announcement deleted', 'info');
      fetchAnnouncements();
    } catch (err: any) {
      showToast('Failed to delete announcement', 'error');
    }
  };

  const updateIssueStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/staff/issues/${id}`, { status });
      showToast(`Issue status updated to ${status}`, 'success');
      fetchIssues();
    } catch (err: any) {
      showToast('Failed to update issue', 'error');
    }
  };

  // Special missing-checkin resolution handler (manual backdated check-in & streak bump)
  const resolveMissingCheckinDispute = async (id: string) => {
    try {
      const res = await api.post(`/api/staff/issues/${id}/resolve-missing-checkin`);
      showToast(res.data.message || 'Backdated check-in granted & streak updated!', 'success');
      fetchIssues();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to resolve dispute', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-400" />
          Content Board & Resolution Hub
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage visitor announcements slider, resolve facility issues & missing check-in streak disputes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'announcements'
              ? 'bg-slate-900 border-t-2 border-emerald-500 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Announcements Slider Board ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'issues'
              ? 'bg-slate-900 border-t-2 border-emerald-500 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Visitor Flagged Issues ({issues.filter((i) => i.status !== 'resolved').length} open)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'audit'
              ? 'bg-slate-900 border-t-2 border-emerald-500 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* TAB 1: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-100">Active Mobile Announcements</h2>
            <button
              onClick={() => setShowAnnounceModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Announcement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((a) => (
              <div key={a._id} className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-3">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <Image className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                      {a.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">{a.title}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">{a.body}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => handleDeleteAnnouncement(a._id)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: VISITOR ISSUES */}
      {activeTab === 'issues' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100">Visitor Issue Flags & Check-in Disputes</h2>
          <div className="space-y-3">
            {issues.map((iss) => (
              <div key={iss._id} className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                      {iss.category}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                        iss.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {iss.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Score: +{(iss.upvotes || 0) - (iss.downvotes || 0)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 mt-1">{iss.description}</p>
                  {iss.reporterId && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Reported by: <span className="text-slate-200">{iss.reporterId.displayName}</span> (Streak: {iss.reporterId.currentStreak || 0}d)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {iss.category === 'missing-checkin' && iss.status !== 'resolved' && (
                    <button
                      onClick={() => resolveMissingCheckinDispute(iss._id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Grant Backdated Check-in (+1 Streak)</span>
                    </button>
                  )}
                  {iss.status !== 'resolved' && (
                    <button
                      onClick={() => updateIssueStatus(iss._id, 'resolved')}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-100 mb-3">System Audit Logs</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-3 bg-slate-800/60 rounded-lg text-xs font-mono flex justify-between">
                <div>
                  <span className="text-emerald-400 font-bold">{log.action}</span>
                  <span className="text-slate-400 ml-2">by {log.performedBy}</span>
                </div>
                <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-base font-bold text-slate-100 mb-4">Create Board Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={announceForm.title}
                  onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Description / Body</label>
                <textarea
                  required
                  rows={3}
                  value={announceForm.body}
                  onChange={(e) => setAnnounceForm({ ...announceForm, body: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={announceForm.category}
                    onChange={(e) => setAnnounceForm({ ...announceForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="pinned">Pinned</option>
                    <option value="event">Event</option>
                    <option value="class">Class</option>
                    <option value="notice">Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={announceForm.imageUrl}
                    onChange={(e) => setAnnounceForm({ ...announceForm, imageUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
