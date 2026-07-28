import React, { useState, useEffect } from 'react';
import {
  Flame,
  Calendar,
  Layers,
  Trophy,
  AlertCircle,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Plus,
  X,
  LogOut,
} from 'lucide-react';
import { useHubAuth } from '../contexts/HubAuthContext';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface Ticket {
  _id: string;
  ticketCode: string;
  status: 'pending' | 'confirmed' | 'rejected';
  requestedAt: string;
}

interface Room {
  id: string;
  name: string;
  capacity: string;
  features: string;
  image: string;
}

interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: string;
  imageUrl?: string;
}

interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  streak: number;
  me: boolean;
}

interface Issue {
  _id: string;
  category: string;
  description: string;
  status: string;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: number;
}

export default function Hub() {
  const { user, login, signup, logout, updateProfile, refreshProfile } = useHubAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'checkin' | 'rooms' | 'announcements' | 'leaderboard' | 'issues'>('checkin');

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAnon, setAuthAnon] = useState(false);

  // Checkin ticket state
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlots, setTimeSlots] = useState<{ slot: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sliderIndex, setSliderIndex] = useState(0);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  // Issues state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueCategory, setIssueCategory] = useState('wifi');
  const [issueDesc, setIssueDesc] = useState('');

  // Initial load
  useEffect(() => {
    fetchRooms();
    fetchAnnouncements();
    fetchLeaderboard();
    fetchIssues();
  }, []);

  // Poll ticket status if active
  useEffect(() => {
    if (!activeTicket || activeTicket.status === 'confirmed') return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/checkins/${activeTicket._id}/status`);
        if (res.data.ticket) {
          setActiveTicket(res.data.ticket);
          if (res.data.ticket.status === 'confirmed') {
            showToast('Check-in confirmed by staff desk! Streak updated 🔥', 'success');
            refreshProfile();
            fetchLeaderboard();
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms');
      setRooms(res.data);
      if (res.data.length > 0) setSelectedRoom(res.data[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSlotsForRoom = async (roomId: string, dateStr: string) => {
    try {
      const res = await api.get(`/api/rooms/${roomId}/slots`, { params: { date: dateStr } });
      setTimeSlots(res.data.slots || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      fetchSlotsForRoom(selectedRoom.id, bookingDate);
    }
  }, [selectedRoom, bookingDate]);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/api/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/api/leaderboard');
      setLeaderboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await api.get('/api/issues');
      setIssues(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateTicket = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setTicketLoading(true);
    try {
      const res = await api.post('/api/checkins');
      setActiveTicket(res.data.ticket);
      showToast(res.data.message || 'Ticket generated! Present to desk', 'info');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not generate check-in ticket', 'error');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleBookRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedRoom || !selectedSlot) {
      showToast('Please select a room time slot', 'error');
      return;
    }
    try {
      await api.post('/api/bookings', {
        roomName: selectedRoom.name,
        date: bookingDate,
        timeSlot: selectedSlot,
        purpose: bookingPurpose,
      });
      showToast('Room booking request submitted! Waiting for staff approval.', 'success');
      setShowBookingModal(false);
      setSelectedSlot('');
      setBookingPurpose('');
      fetchSlotsForRoom(selectedRoom.id, bookingDate);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit booking', 'error');
    }
  };

  const handleVoteIssue = async (id: string, direction: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.post(`/api/issues/${id}/vote`, { direction });
      setIssues((prev) =>
        prev.map((i) =>
          i._id === id
            ? {
                ...i,
                upvotes: res.data.upvotes,
                downvotes: res.data.downvotes,
                score: res.data.score,
                userVote: res.data.userVote,
              }
            : i
        )
      );
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to vote', 'error');
    }
  };

  const handlePostIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      await api.post('/api/issues', {
        category: issueCategory,
        description: issueDesc,
      });
      showToast('Issue posted to community board!', 'success');
      setShowIssueModal(false);
      setIssueDesc('');
      fetchIssues();
    } catch (err: any) {
      showToast('Failed to post issue', 'error');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignup) {
        await signup({
          name: authName,
          email: authEmail,
          password: authPassword,
          isAnonymous: authAnon,
        });
        showToast('Welcome to The Hub!', 'success');
      } else {
        await login(authEmail, authPassword);
        showToast('Logged in!', 'success');
      }
      setShowAuthModal(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Authentication failed', 'error');
    }
  };

  const currentStreak = user?.currentStreak || 0;

  return (
    <div className="min-h-screen bg-[#12201B] text-[#F4EEDF] font-inter flex justify-center pb-20 select-none">
      <div className="w-full max-w-md bg-[#12201B] min-h-screen flex flex-col relative shadow-2xl">
        {/* TOP BAR */}
        <header className="p-4 flex items-center justify-between border-b border-[#223830]">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#8FA096] uppercase">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight font-space text-[#FFC24B]">THE HUB</h1>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateProfile({ isAnonymous: !user.isAnonymous })}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-[#1A2C24] text-[#3FC7B8] border border-[#223830]"
                >
                  {user.isAnonymous ? '👻 Anon' : '👤 Public'}
                </button>
                <button
                  onClick={logout}
                  className="p-2 text-[#8FA096] hover:text-[#F4EEDF] bg-[#1A2C24] rounded-xl"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#3FC7B8] text-[#12201B] font-bold text-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* MAIN TAB CONTENT AREA */}
        <main className="flex-1 p-4 space-y-6">
          {/* TAB 1: DAILY CHECK-IN & STREAK PUNCH CARD */}
          {activeTab === 'checkin' && (
            <div className="space-y-6">
              {/* TICKET PASS */}
              <div className="pass-ticket rounded-2xl p-6 text-[#12201B] shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#8FA096]">
                      Visitor Entry Pass
                    </span>
                    <h2 className="text-2xl font-black font-space tracking-tight mt-0.5">
                      {activeTicket ? activeTicket.ticketCode : 'HUB-READY'}
                    </h2>
                  </div>
                  <div className="p-2 bg-[#12201B] text-[#FFC24B] rounded-xl font-mono text-xs font-bold">
                    🔥 {currentStreak}D STREAK
                  </div>
                </div>

                <div className="my-6 py-4 border-y border-dashed border-[#D9CDA9] text-center">
                  {activeTicket ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12201B] text-[#3FC7B8] text-xs font-mono">
                        <span className="w-2 h-2 rounded-full bg-[#3FC7B8] animate-ping" />
                        <span>
                          {activeTicket.status === 'pending'
                            ? 'Waiting for desk verification...'
                            : activeTicket.status === 'confirmed'
                            ? 'Verified Check-in!'
                            : 'Ticket Rejected'}
                        </span>
                      </div>
                      <p className="text-xs text-[#223830] font-medium">Present this pass to IAC staff desk</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateTicket}
                      disabled={ticketLoading}
                      className="w-full py-3 bg-[#12201B] text-[#FFC24B] rounded-xl font-bold text-sm hover:opacity-95 transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{ticketLoading ? 'Generating Ticket...' : 'Request Today\'s Check-in Ticket'}</span>
                    </button>
                  )}
                </div>

                {/* 21-HOLE STREAK PUNCH CARD VISUALIZER */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#8FA096] mb-2">
                    <span>21-Day Consecutive Punch Card</span>
                    <span>{currentStreak} / 21 Holes</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 21 }).map((_, idx) => {
                      const punched = idx < currentStreak;
                      return (
                        <div
                          key={idx}
                          className={`h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border transition ${
                            punched
                              ? 'bg-[#12201B] text-[#FFC24B] border-[#12201B] hole-punch'
                              : 'bg-transparent text-[#8FA096] border-[#D9CDA9]'
                          }`}
                        >
                          {punched ? '✓' : idx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* MILESTONE BADGES */}
              <div className="bg-[#1A2C24] rounded-2xl p-4 border border-[#223830]">
                <h3 className="text-xs font-bold text-[#8FA096] uppercase font-mono mb-3">Streak Milestones</h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className={`p-2 rounded-xl border ${currentStreak >= 7 ? 'bg-[#FFC24B]/20 text-[#FFC24B] border-[#FFC24B]/40' : 'bg-[#12201B] text-[#8FA096] border-[#223830]'}`}>
                    <p className="font-bold">7 Days</p>
                    <p className="text-[9px] mt-0.5">Spark</p>
                  </div>
                  <div className={`p-2 rounded-xl border ${currentStreak >= 14 ? 'bg-[#FFC24B]/20 text-[#FFC24B] border-[#FFC24B]/40' : 'bg-[#12201B] text-[#8FA096] border-[#223830]'}`}>
                    <p className="font-bold">14 Days</p>
                    <p className="text-[9px] mt-0.5">Ember</p>
                  </div>
                  <div className={`p-2 rounded-xl border ${currentStreak >= 30 ? 'bg-[#FFC24B]/20 text-[#FFC24B] border-[#FFC24B]/40' : 'bg-[#12201B] text-[#8FA096] border-[#223830]'}`}>
                    <p className="font-bold">30 Days</p>
                    <p className="text-[9px] mt-0.5">Flame</p>
                  </div>
                  <div className={`p-2 rounded-xl border ${currentStreak >= 100 ? 'bg-[#FFC24B]/20 text-[#FFC24B] border-[#FFC24B]/40' : 'bg-[#12201B] text-[#8FA096] border-[#223830]'}`}>
                    <p className="font-bold">100 Days</p>
                    <p className="text-[9px] mt-0.5">Legend</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOM BOOKING REQUESTS */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold font-space text-[#F4EEDF]">Book Room Slot</h2>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="bg-[#1A2C24] border border-[#223830] text-[#3FC7B8] text-xs px-2.5 py-1 rounded-xl font-mono"
                />
              </div>

              {/* Room selector cards */}
              <div className="space-y-3">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoom(r)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex gap-3 ${
                      selectedRoom?.id === r.id
                        ? 'bg-[#1A2C24] border-[#3FC7B8]'
                        : 'bg-[#1A2C24]/50 border-[#223830]'
                    }`}
                  >
                    <img src={r.image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-[#F4EEDF]">{r.name}</h3>
                      <p className="text-xs text-[#3FC7B8] font-mono mt-0.5">{r.capacity}</p>
                      <p className="text-[11px] text-[#8FA096] mt-1 line-clamp-2">{r.features}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots grid */}
              {selectedRoom && (
                <div className="bg-[#1A2C24] rounded-2xl p-4 border border-[#223830] space-y-3">
                  <h3 className="text-xs font-bold font-mono text-[#8FA096]">
                    Available Slots for {selectedRoom.name}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((ts) => (
                      <button
                        key={ts.slot}
                        disabled={!ts.available}
                        onClick={() => setSelectedSlot(ts.slot)}
                        className={`py-2 rounded-xl text-xs font-mono font-bold border transition ${
                          selectedSlot === ts.slot
                            ? 'bg-[#3FC7B8] text-[#12201B] border-[#3FC7B8]'
                            : ts.available
                            ? 'bg-[#12201B] text-[#F4EEDF] border-[#223830] hover:border-[#3FC7B8]'
                            : 'bg-[#12201B]/40 text-[#8FA096]/40 border-transparent cursor-not-allowed line-through'
                        }`}
                      >
                        {ts.slot}
                      </button>
                    ))}
                  </div>

                  {selectedSlot && (
                    <button
                      onClick={() => setShowBookingModal(true)}
                      className="w-full py-3 bg-[#3FC7B8] text-[#12201B] font-bold text-xs rounded-xl mt-3 shadow-lg"
                    >
                      Request Booking for {selectedSlot}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENTS SLIDER BOARD */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold font-space text-[#F4EEDF]">Center Announcements</h2>

              {announcements.length > 0 && (
                <div className="bg-[#1A2C24] rounded-2xl border border-[#223830] overflow-hidden shadow-xl">
                  {announcements[sliderIndex]?.imageUrl && (
                    <img
                      src={announcements[sliderIndex].imageUrl}
                      alt=""
                      className="w-full h-44 object-cover"
                    />
                  )}
                  <div className="p-5 space-y-2">
                    <span className="text-[10px] font-mono uppercase bg-[#3FC7B8]/20 text-[#3FC7B8] px-2 py-0.5 rounded font-bold">
                      {announcements[sliderIndex].category}
                    </span>
                    <h3 className="text-lg font-bold text-[#F4EEDF]">{announcements[sliderIndex].title}</h3>
                    <p className="text-xs text-[#8FA096]">{announcements[sliderIndex].body}</p>
                  </div>

                  {/* Controls */}
                  <div className="p-3 bg-[#12201B] flex justify-between items-center border-t border-[#223830]">
                    <button
                      onClick={() => setSliderIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1))}
                      className="p-1.5 text-[#8FA096] hover:text-[#F4EEDF]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-1.5">
                      {announcements.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition ${
                            sliderIndex === idx ? 'bg-[#3FC7B8] w-4' : 'bg-[#223830]'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setSliderIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0))}
                      className="p-1.5 text-[#8FA096] hover:text-[#F4EEDF]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold font-space text-[#F4EEDF]">Streak Champions Leaderboard</h2>
              <div className="space-y-2">
                {leaderboard.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      item.me
                        ? 'bg-[#3FC7B8]/15 border-[#3FC7B8] text-[#3FC7B8]'
                        : 'bg-[#1A2C24] border-[#223830] text-[#F4EEDF]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold w-6 text-[#FFC24B]">#{item.rank}</span>
                      <div>
                        <p className="text-xs font-bold">{item.name}</p>
                        {item.me && <p className="text-[9px] font-mono uppercase text-[#3FC7B8]">You</p>}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#FFC24B]">🔥 {item.streak}D</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ISSUES BOARD */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold font-space text-[#F4EEDF]">Community Issue Board</h2>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="px-3 py-1.5 bg-[#FFC24B] text-[#12201B] font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Flag Issue</span>
                </button>
              </div>

              <div className="space-y-3">
                {issues.map((iss) => (
                  <div key={iss._id} className="p-4 rounded-2xl bg-[#1A2C24] border border-[#223830] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase bg-[#FFC24B]/20 text-[#FFC24B] px-2 py-0.5 rounded font-bold">
                        {iss.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#8FA096] uppercase">{iss.status}</span>
                    </div>

                    <p className="text-xs text-[#F4EEDF] font-medium">{iss.description}</p>

                    <div className="flex items-center gap-3 pt-2 border-t border-[#223830]">
                      <button
                        onClick={() => handleVoteIssue(iss._id, 1)}
                        className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                          iss.userVote === 1 ? 'bg-[#3FC7B8] text-[#12201B]' : 'bg-[#12201B] text-[#8FA096]'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{iss.upvotes || 0}</span>
                      </button>

                      <button
                        onClick={() => handleVoteIssue(iss._id, -1)}
                        className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                          iss.userVote === -1 ? 'bg-rose-600 text-white' : 'bg-[#12201B] text-[#8FA096]'
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span>{iss.downvotes || 0}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 max-w-md w-full bg-[#12201B]/95 backdrop-blur border-t border-[#223830] px-3 py-2 flex justify-around items-center z-40">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition ${
              activeTab === 'checkin' ? 'text-[#FFC24B]' : 'text-[#8FA096]'
            }`}
          >
            <Flame className="w-5 h-5" />
            <span>Check-in</span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition ${
              activeTab === 'rooms' ? 'text-[#3FC7B8]' : 'text-[#8FA096]'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Rooms</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition ${
              activeTab === 'announcements' ? 'text-[#3FC7B8]' : 'text-[#8FA096]'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Board</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition ${
              activeTab === 'leaderboard' ? 'text-[#FFC24B]' : 'text-[#8FA096]'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Ranks</span>
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition ${
              activeTab === 'issues' ? 'text-[#FFC24B]' : 'text-[#8FA096]'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span>Issues</span>
          </button>
        </nav>

        {/* ROOM BOOKING CONFIRMATION MODAL */}
        {showBookingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1A2C24] border border-[#223830] rounded-3xl p-6 max-w-sm w-full space-y-4">
              <h3 className="text-base font-bold font-space text-[#F4EEDF]">Confirm Room Request</h3>
              <p className="text-xs text-[#8FA096]">
                Requesting <span className="text-[#3FC7B8] font-bold">{selectedRoom?.name}</span> for{' '}
                <span className="text-[#3FC7B8] font-bold">{selectedSlot}</span> on {bookingDate}.
              </p>
              <div>
                <label className="block text-xs text-[#8FA096] mb-1">Purpose / Event</label>
                <input
                  type="text"
                  placeholder="e.g. Korean Class / Group Study"
                  value={bookingPurpose}
                  onChange={(e) => setBookingPurpose(e.target.value)}
                  className="w-full bg-[#12201B] border border-[#223830] text-[#F4EEDF] rounded-xl p-2.5 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 py-2.5 bg-[#12201B] text-[#8FA096] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookRoomSubmit}
                  className="flex-1 py-2.5 bg-[#3FC7B8] text-[#12201B] rounded-xl text-xs font-bold"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ISSUE CREATION MODAL */}
        {showIssueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1A2C24] border border-[#223830] rounded-3xl p-6 max-w-sm w-full space-y-4">
              <h3 className="text-base font-bold font-space text-[#F4EEDF]">Flag an Issue</h3>
              <div>
                <label className="block text-xs text-[#8FA096] mb-1">Category</label>
                <select
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value)}
                  className="w-full bg-[#12201B] border border-[#223830] text-[#F4EEDF] rounded-xl p-2.5 text-xs"
                >
                  <option value="wifi">Wi-Fi / Internet</option>
                  <option value="ac">Air Conditioning</option>
                  <option value="noise">Noise / Disturbance</option>
                  <option value="missing-checkin">Missing Check-in Dispute</option>
                  <option value="other">Other Facility Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#8FA096] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe what is wrong..."
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  className="w-full bg-[#12201B] border border-[#223830] text-[#F4EEDF] rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 py-2.5 bg-[#12201B] text-[#8FA096] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostIssueSubmit}
                  className="flex-1 py-2.5 bg-[#FFC24B] text-[#12201B] rounded-xl text-xs font-bold"
                >
                  Post Flag
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUTH MODAL */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1A2C24] border border-[#223830] rounded-3xl p-6 max-w-sm w-full space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold font-space text-[#F4EEDF]">
                  {isSignup ? 'Create Hub Account' : 'Sign In to The Hub'}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="text-[#8FA096]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                {isSignup && (
                  <div>
                    <label className="block text-[#8FA096] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-[#12201B] border border-[#223830] text-[#F4EEDF] rounded-xl p-2.5"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[#8FA096] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#12201B] border border-[#223830] text-[#F4EEDF] rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-[#8FA096] mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-[#12201B] border border-[#223830] text-[#F4EEDF] rounded-xl p-2.5"
                  />
                </div>

                {isSignup && (
                  <label className="flex items-center gap-2 text-[#8FA096] pt-1">
                    <input
                      type="checkbox"
                      checked={authAnon}
                      onChange={(e) => setAuthAnon(e.target.checked)}
                      className="rounded bg-[#12201B] border-[#223830]"
                    />
                    <span>Stay Anonymous on Leaderboard (Guest #hash)</span>
                  </label>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#3FC7B8] text-[#12201B] rounded-xl font-bold text-xs mt-2"
                >
                  {isSignup ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <p className="text-[11px] text-[#8FA096] text-center pt-2">
                {isSignup ? 'Already have an account?' : 'New visitor?'}{' '}
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-[#3FC7B8] font-bold underline"
                >
                  {isSignup ? 'Sign in' : 'Create an account'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
