import { useState, useEffect } from 'react';
import { Calendar, Check, X, Clock, User } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface PendingBooking {
  _id: string;
  roomName: string;
  date: string;
  timeSlot: string;
  purpose: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    displayName: string;
    email: string;
  };
}

interface EventProgram {
  _id: string;
  programName: string;
  roomType: string;
  date: string;
  organizer: string;
  presenter: string;
  participants: number;
}

export default function Rooms() {
  const { showToast } = useToast();
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);

  const [eventPrograms, setEventPrograms] = useState<EventProgram[]>([]);

  const fetchPendingBookings = async () => {
    try {
      const res = await api.get('/api/staff/bookings/pending');
      setPendingBookings(res.data);
    } catch (err) {
      console.error('Pending bookings fetch error:', err);
    }
  };

  const fetchEventPrograms = async () => {
    try {
      const res = await api.get('/api/events');
      setEventPrograms(res.data);
    } catch (err) {
      console.error('Events fetch error:', err);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    fetchEventPrograms();
  }, []);

  const approveBooking = async (id: string, roomName: string) => {
    try {
      await api.post(`/api/staff/bookings/${id}/approve`);
      showToast(`Approved booking for ${roomName}!`, 'success');
      fetchPendingBookings();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve booking', 'error');
    }
  };

  const declineBooking = async (id: string) => {
    try {
      await api.post(`/api/staff/bookings/${id}/decline`, { reason: 'Schedule clash' });
      showToast('Booking declined', 'info');
      fetchPendingBookings();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to decline booking', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-teal-400" />
          Room Management & Approvals
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Approve visitor mobile room requests & manage center training schedules.
        </p>
      </div>

      {/* SECTION 1: VISITOR ROOM BOOKING APPROVALS QUEUE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono">
              Pending Mobile Booking Requests ({pendingBookings.length})
            </h2>
          </div>
          <button
            onClick={fetchPendingBookings}
            className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg"
          >
            Refresh Queue
          </button>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No pending visitor room booking requests at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {pendingBookings.map((b) => (
              <div
                key={b._id}
                className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/30 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-teal-300">{b.roomName}</span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono px-2 py-0.5 rounded">
                      {b.timeSlot}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-mono">Date: {b.date}</p>
                  <p className="text-xs text-slate-400 italic mt-1">"{b.purpose}"</p>

                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{b.user.displayName}</p>
                      <p className="text-[10px] text-slate-400">{b.user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => approveBooking(b._id, b.roomName)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => declineBooking(b._id)}
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

      {/* SECTION 2: STAFF EVENT PROGRAMS SCHEDULE TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono mb-4">
          Center Scheduled Events & Programs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Program / Event Name</th>
                <th className="p-3">Venue / Room</th>
                <th className="p-3">Date</th>
                <th className="p-3">Organizer</th>
                <th className="p-3">Participants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {eventPrograms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No scheduled events found.
                  </td>
                </tr>
              ) : (
                eventPrograms.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-100">{e.programName}</td>
                    <td className="p-3 text-teal-300">{e.roomType}</td>
                    <td className="p-3 font-mono text-slate-400">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-3">{e.organizer}</td>
                    <td className="p-3 font-mono">{e.participants || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
