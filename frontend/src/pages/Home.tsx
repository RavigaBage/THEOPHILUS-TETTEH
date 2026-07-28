import { useState, useEffect } from 'react';
import { Calendar, FileText, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingCheckins: 0,
    pendingBookings: 0,
    openIssues: 0,
    announcementsCount: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [cRes, bRes, iRes, aRes] = await Promise.all([
          api.get('/api/staff/checkins/pending').catch(() => ({ data: [] })),
          api.get('/api/staff/bookings/pending').catch(() => ({ data: [] })),
          api.get('/api/staff/issues').catch(() => ({ data: [] })),
          api.get('/api/announcements').catch(() => ({ data: [] })),
        ]);
        setStats({
          pendingCheckins: Array.isArray(cRes.data) ? cRes.data.length : 0,
          pendingBookings: Array.isArray(bRes.data) ? bRes.data.length : 0,
          openIssues: Array.isArray(iRes.data) ? iRes.data.filter((x: any) => x.status !== 'resolved').length : 0,
          announcementsCount: Array.isArray(aRes.data) ? aRes.data.length : 0,
        });
      } catch (err) {
        console.error('Stats load error:', err);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">IAC Overview & Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time status across staff operations and visitor mobile hub.</p>
      </div>

      {/* Visitor Hub Callout Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 mb-2">
            Mobile Web App Ready
          </span>
          <h2 className="text-lg font-bold text-slate-100">Visitor Mobile App — "The Hub"</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Visitors check in daily to build streaks, request room bookings, browse the image announcements slider, view leaderboards, and flag issues.
          </p>
        </div>
        <button
          onClick={() => navigate('/hub')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          <span>Launch Visitor App</span>
        </button>
      </div>

      {/* Operation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/lounge')}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Pending Check-in Queue</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{stats.pendingCheckins}</p>
          <p className="text-[11px] text-amber-400 mt-1">Waiting for desk verification</p>
        </div>

        <div
          onClick={() => navigate('/rooms')}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Room Booking Requests</span>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{stats.pendingBookings}</p>
          <p className="text-[11px] text-teal-400 mt-1">Visitor room requests</p>
        </div>

        <div
          onClick={() => navigate('/reports')}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Open Visitor Issues</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{stats.openIssues}</p>
          <p className="text-[11px] text-rose-400 mt-1">Flags & disputes to resolve</p>
        </div>

        <div
          onClick={() => navigate('/reports')}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Active Announcements</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">{stats.announcementsCount}</p>
          <p className="text-[11px] text-emerald-400 mt-1">On slider board</p>
        </div>
      </div>
    </div>
  );
}
