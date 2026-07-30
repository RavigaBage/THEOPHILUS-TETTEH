import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Calendar,
  AlertTriangle,
  Trophy,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Volume2,
  Wifi,
  Wind,
  Ticket,
  Mail,
  Lock,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface Announcement {
  _id: string;
  category: 'pinned' | 'event' | 'class' | 'notice';
  title: string;
  description: string;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
}

interface Issue {
  _id: string;
  title: string;
  category: string;
  description: string;
  status: 'seen' | 'pending' | 'resolved' | 'open' | 'progress';
  reporterName: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  myVote: number;
}

interface CheckinTicketItem {
  _id: string;
  ticketCode: string;
  status: 'pending' | 'confirmed' | 'expired';
  userName: string;
  contact: string;
  identifierType: string;
  identifier: string;
  requestedAt: string;
}

interface BookingRequestItem {
  _id: string;
  contactName: string;
  contactEmail: string;
  roomId: string;
  requestedDate: string;
  requestedSlot: string;
  status: 'pending' | 'confirmed' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

interface LeaderboardUser {
  _id: string;
  rank: number;
  name: string;
  streak: number;
  deviceId: string;
}

const DEFAULT_SLIDE_IMG =
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=60&auto=format&fit=crop';

export default function MobileApp() {
  // Device ID setup
  const [deviceId, setDeviceId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ name: string; streak: number; email: string; isAnonymous: boolean }>({
    name: 'Guest User',
    streak: 0,
    email: '',
    isAnonymous: false,
  });

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'board' | 'rank' | 'report'>('home');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [adminSubTab, setAdminSubTab] = useState<'tickets' | 'bookings' | 'issues' | 'announcements' | 'smtp'>('tickets');

  // Staff auth token
  const [staffToken, setStaffToken] = useState<string>(localStorage.getItem('token') || '');
  const [staffLoginForm, setStaffLoginForm] = useState({ email: 'admin@iac.com', password: '' });
  const [staffError, setStaffError] = useState<string>('');

  // App Data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  // Check-in state
  const [activeTicket, setActiveTicket] = useState<CheckinTicketItem | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [checkinName, setCheckinName] = useState<string>('Guest');
  const [checkinContact, setCheckinContact] = useState<string>('0240000000');
  const [isAnonCheckin, setIsAnonCheckin] = useState<boolean>(false);

  // Booking state
  const [selectedRoom, setSelectedRoom] = useState<string>('Seminar Room 1');
  const [selectedSlot, setSelectedSlot] = useState<string>('09:00');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [bookingSubmitted, setBookingSubmitted] = useState<boolean>(false);

  // Reporting issue state
  const [newIssueTitle, setNewIssueTitle] = useState<string>('');
  const [newIssueDesc, setNewIssueDesc] = useState<string>('');
  const [newIssueCategory, setNewIssueCategory] = useState<string>('General');

  // Admin Queue Data
  const [pendingTickets, setPendingTickets] = useState<CheckinTicketItem[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequestItem[]>([]);

  // Admin Announcement Form state
  const [annoModalOpen, setAnnoModalOpen] = useState<boolean>(false);
  const [editingAnnoId, setEditingAnnoId] = useState<string | null>(null);
  const [annoForm, setAnnoForm] = useState<{
    category: 'pinned' | 'event' | 'class' | 'notice';
    title: string;
    description: string;
    imageUrl: string;
    sortOrder: number;
  }>({
    category: 'notice',
    title: '',
    description: '',
    imageUrl: '',
    sortOrder: 0,
  });

  // Admin Booking Reject Modal
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // SMTP Settings state
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    fromName: 'IAC System',
    fromEmail: '',
  });
  const [testEmailAddr, setTestEmailAddr] = useState<string>('');
  const [smtpStatusMsg, setSmtpStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Auto-slide interval
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // Initial setup: get or create deviceId
  useEffect(() => {
    let id = localStorage.getItem('iac_mobile_device_id');
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      localStorage.setItem('iac_mobile_device_id', id);
    }
    setDeviceId(id);
    fetchProfile(id);
    fetchAnnouncements();
    fetchIssues(id);
    fetchLeaderboard();
  }, []);

  // Poll ticket status when checking in
  useEffect(() => {
    if (!activeTicket || activeTicket.status !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mobile/checkin/ticket/status/${activeTicket.ticketCode}`);
        const data = await res.json();
        if (data.status === 'success' && data.data) {
          setActiveTicket(data.data);
          if (data.data.status === 'confirmed') {
            clearInterval(interval);
            // Refresh profile to reflect new streak
            fetchProfile(deviceId);
            fetchLeaderboard();
          }
        }
      } catch (err) {
        console.error('Error polling ticket status:', err);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [activeTicket, deviceId]);

  // Poll admin queue when in admin mode
  useEffect(() => {
    if (!isAdminMode || !staffToken) return;
    fetchPendingTickets();
    fetchBookingRequests();
    fetchSmtpSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminMode, staffToken, adminSubTab]);

  const fetchProfile = async (devId: string) => {
    try {
      const res = await fetch('/api/mobile/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: devId }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUserProfile(data.data);
        if (data.data.name) {
          setCheckinName(data.data.name);
          setContactName(data.data.name);
        }
        if (data.data.email) setContactEmail(data.data.email);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      if (data.status === 'success') {
        setAnnouncements(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const fetchIssues = async (devId: string) => {
    try {
      const res = await fetch(`/api/mobile/issues?deviceId=${devId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setIssues(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching issues:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/mobile/leaderboard');
      const data = await res.json();
      if (data.status === 'success') {
        setLeaderboard(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchPendingTickets = async () => {
    try {
      const res = await fetch('/api/mobile/checkin/pending', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') setPendingTickets(data.data || []);
    } catch (err) {
      console.error('Error fetching pending tickets:', err);
    }
  };

  const fetchBookingRequests = async () => {
    try {
      const res = await fetch('/api/mobile/bookings', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') setBookingRequests(data.data || []);
    } catch (err) {
      console.error('Error fetching booking requests:', err);
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch('/api/settings/smtp', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setSmtpForm({
          smtpHost: data.data.smtpHost || 'smtp.gmail.com',
          smtpPort: data.data.smtpPort || 587,
          smtpSecure: !!data.data.smtpSecure,
          smtpUser: data.data.smtpUser || '',
          smtpPass: '',
          fromName: data.data.fromName || 'IAC System',
          fromEmail: data.data.fromEmail || '',
        });
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
    }
  };

  // User Actions
  const handleStartCheckin = async () => {
    setIsCheckingIn(true);
    try {
      const res = await fetch('/api/mobile/checkin/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          userName: checkinName || 'Guest User',
          contact: checkinContact || 'N/A',
          identifierType: 'student_id',
          identifier: deviceId.slice(-6),
          gender: 'other',
          anonymous: isAnonCheckin,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setActiveTicket(data.data);
      }
    } catch (err) {
      console.error('Error starting check-in:', err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleVote = async (issueId: string, direction: number) => {
    try {
      const res = await fetch(`/api/mobile/issues/${issueId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, direction }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchIssues(deviceId);
      } else {
        alert(data.message || 'Could not record vote');
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle) return;
    try {
      const res = await fetch('/api/mobile/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIssueTitle,
          category: newIssueCategory,
          description: newIssueDesc,
          deviceId,
          reporterName: userProfile.isAnonymous ? 'Anonymous' : (userProfile.name || 'Visitor'),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNewIssueTitle('');
        setNewIssueDesc('');
        fetchIssues(deviceId);
      }
    } catch (err) {
      console.error('Error reporting issue:', err);
    }
  };

  const handlePresetFlag = async (title: string, category: string) => {
    try {
      const res = await fetch('/api/mobile/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          description: `Quick flag reported from mobile app`,
          deviceId,
          reporterName: userProfile.isAnonymous ? 'Anonymous' : (userProfile.name || 'Visitor'),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchIssues(deviceId);
      }
    } catch (err) {
      console.error('Error flagging preset:', err);
    }
  };

  const handleConfirmBooking = async () => {
    if (!contactName || !contactEmail) {
      alert('Please enter your name and contact email');
      return;
    }
    try {
      const res = await fetch('/api/mobile/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          contactName,
          contactEmail,
          roomId: selectedRoom,
          requestedDate: bookingDate,
          requestedSlot: selectedSlot,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setBookingSubmitted(true);
      } else {
        alert(data.message || 'Failed to submit booking request');
      }
    } catch (err) {
      console.error('Error submitting booking:', err);
    }
  };

  // Staff/Admin Actions
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffLoginForm),
      });
      const data = await res.json();
      if (data.status === 'success' && data.token) {
        setStaffToken(data.token);
        localStorage.setItem('token', data.token);
      } else {
        setStaffError(data.message || 'Invalid credentials');
      }
    } catch (err: any) {
      setStaffError(err.message || 'Login failed');
    }
  };

  const handleConfirmCheckinTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/mobile/checkin/confirm/${ticketId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchPendingTickets();
      } else {
        alert(data.message || 'Error confirming ticket');
      }
    } catch (err) {
      console.error('Error confirming ticket:', err);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, status: 'seen' | 'pending' | 'resolved') => {
    try {
      const res = await fetch(`/api/mobile/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchIssues(deviceId);
      }
    } catch (err) {
      console.error('Error updating issue status:', err);
    }
  };

  const handleConfirmBookingRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/mobile/bookings/${requestId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert('Booking request confirmed! Email sent to user.');
        fetchBookingRequests();
      } else {
        alert(data.message || 'Failed to confirm booking request');
      }
    } catch (err) {
      console.error('Error confirming booking request:', err);
    }
  };

  const handleRejectBookingRequest = async () => {
    if (!rejectModalId) return;
    try {
      const res = await fetch(`/api/mobile/bookings/${rejectModalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert('Booking request rejected. Rejection email sent.');
        setRejectModalId(null);
        setRejectReason('');
        fetchBookingRequests();
      } else {
        alert(data.message || 'Failed to reject booking request');
      }
    } catch (err) {
      console.error('Error rejecting booking request:', err);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAnnoId
        ? `/api/mobile/announcements/${editingAnnoId}`
        : '/api/mobile/announcements';
      const method = editingAnnoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify(annoForm),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setAnnoModalOpen(false);
        setEditingAnnoId(null);
        setAnnoForm({ category: 'notice', title: '', description: '', imageUrl: '', sortOrder: 0 });
        fetchAnnouncements();
      } else {
        alert(data.message || 'Failed to save announcement');
      }
    } catch (err) {
      console.error('Error saving announcement:', err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/mobile/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpStatusMsg(null);
    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify(smtpForm),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSmtpStatusMsg({ type: 'success', msg: 'SMTP settings updated successfully' });
      } else {
        setSmtpStatusMsg({ type: 'error', msg: data.message || 'Failed to update SMTP settings' });
      }
    } catch (err: any) {
      setSmtpStatusMsg({ type: 'error', msg: err.message || 'Error updating settings' });
    }
  };

  const handleSendTestEmail = async () => {
    setSmtpStatusMsg(null);
    try {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ testEmail: testEmailAddr }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSmtpStatusMsg({ type: 'success', msg: `Test email sent successfully to ${testEmailAddr || 'admin'}` });
      } else {
        setSmtpStatusMsg({ type: 'error', msg: data.message || 'Failed to send test email' });
      }
    } catch (err: any) {
      setSmtpStatusMsg({ type: 'error', msg: err.message || 'Error sending test email' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A130F] py-8 px-3 flex flex-col items-center justify-center font-sans">
      {/* Phone Frame */}
      <div className="w-[390px] bg-[#12201B] rounded-[44px] p-3.5 shadow-2xl relative border border-[#223830]">
        
        {/* Phone Screen */}
        <div className="bg-gradient-to-b from-[#12201B] to-[#1A2C24] rounded-[32px] overflow-hidden min-h-[760px] flex flex-col relative text-[#F4EEDF]">
          
          {/* Status Bar */}
          <div className="flex justify-between items-center px-6 pt-4 pb-1 text-[#8FA096] font-mono text-[11px]">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FC7B8]"></span>
              THE HUB · LIVE
            </span>
          </div>

          {/* Top Bar with Mode Switcher */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-[#2C4238]/60">
            <div>
              <div className="font-bold text-xl tracking-tight font-serif">
                The<span className="text-[#FFFFFF]">Hub</span>
              </div>
              <p className="text-[10px] text-[#8FA096] font-mono">Adjei Business Center</p>
            </div>

            {/* Admin / User Role Toggle */}
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`px-3 py-1.5 rounded-full font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                isAdminMode
                  ? 'bg-[#FFC24B] text-[#412402] shadow-sm'
                  : 'bg-[#223830] text-[#8FA096] hover:text-[#F4EEDF] border border-[#2C4238]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {isAdminMode ? 'Staff Mode' : 'User Mode'}
            </button>
          </div>

          {/* MAIN CONTENT CANVAS */}
          <div className="flex-1 px-5 pt-4 pb-24 overflow-y-auto">

            {/* ========================================== */}
            {/* ADMIN / STAFF VIEW INSIDE MOBILE APP       */}
            {/* ========================================== */}
            {isAdminMode ? (
              <div>
                {!staffToken ? (
                  /* Staff Authentication Form */
                  <div className="bg-[#1A2C24] border border-[#2C4238] rounded-2xl p-5 my-4">
                    <div className="flex items-center gap-2 mb-3 text-[#FFC24B]">
                      <Lock className="w-5 h-5" />
                      <h3 className="font-bold text-base">Staff Authorization</h3>
                    </div>
                    <p className="text-xs text-[#8FA096] mb-4">
                      Log in with your IAC staff credentials to review check-ins, manage bookings, update issues, and configure announcements.
                    </p>
                    <form onSubmit={handleStaffLogin} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-mono text-[#8FA096]">Email</label>
                        <input
                          type="email"
                          value={staffLoginForm.email}
                          onChange={(e) => setStaffLoginForm({ ...staffLoginForm, email: e.target.value })}
                          className="w-full bg-[#12201B] border border-[#2C4238] rounded-xl px-3 py-2 text-xs text-[#F4EEDF] focus:outline-none focus:border-[#3FC7B8]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#8FA096]">Password</label>
                        <input
                          type="password"
                          value={staffLoginForm.password}
                          onChange={(e) => setStaffLoginForm({ ...staffLoginForm, password: e.target.value })}
                          className="w-full bg-[#12201B] border border-[#2C4238] rounded-xl px-3 py-2 text-xs text-[#F4EEDF] focus:outline-none focus:border-[#3FC7B8]"
                          required
                        />
                      </div>
                      {staffError && <p className="text-xs text-red-400 font-mono">{staffError}</p>}
                      <button
                        type="submit"
                        className="w-full bg-[#3FC7B8] text-[#04342C] font-bold py-2.5 rounded-xl text-xs hover:bg-[#3FC7B8]/90 transition"
                      >
                        Authenticate
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Staff Management Dashboard Inside Mobile */
                  <div>
                    {/* Admin Subnav */}
                    <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none border-b border-[#2C4238]">
                      <button
                        onClick={() => setAdminSubTab('tickets')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap ${
                          adminSubTab === 'tickets' ? 'bg-[#3FC7B8] text-[#04342C] font-bold' : 'text-[#8FA096]'
                        }`}
                      >
                        Tickets ({pendingTickets.length})
                      </button>
                      <button
                        onClick={() => setAdminSubTab('bookings')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap ${
                          adminSubTab === 'bookings' ? 'bg-[#3FC7B8] text-[#04342C] font-bold' : 'text-[#8FA096]'
                        }`}
                      >
                        Bookings ({bookingRequests.filter((b) => b.status === 'pending').length})
                      </button>
                      <button
                        onClick={() => setAdminSubTab('issues')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap ${
                          adminSubTab === 'issues' ? 'bg-[#3FC7B8] text-[#04342C] font-bold' : 'text-[#8FA096]'
                        }`}
                      >
                        Issues
                      </button>
                      <button
                        onClick={() => setAdminSubTab('announcements')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap ${
                          adminSubTab === 'announcements' ? 'bg-[#3FC7B8] text-[#04342C] font-bold' : 'text-[#8FA096]'
                        }`}
                      >
                        Announce
                      </button>
                      <button
                        onClick={() => setAdminSubTab('smtp')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap ${
                          adminSubTab === 'smtp' ? 'bg-[#3FC7B8] text-[#04342C] font-bold' : 'text-[#8FA096]'
                        }`}
                      >
                        SMTP
                      </button>
                    </div>

                    {/* SUBTAB 1: CHECK-IN TICKETS QUEUE */}
                    {adminSubTab === 'tickets' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-xs text-[#FFC24B] font-mono uppercase">Pending Desk Check-ins</h4>
                          <button onClick={fetchPendingTickets} className="text-[#3FC7B8] p-1">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {pendingTickets.length === 0 ? (
                          <div className="bg-[#223830] rounded-xl p-4 text-center text-xs text-[#8FA096]">
                            No pending tickets right now
                          </div>
                        ) : (
                          pendingTickets.map((tk) => (
                            <div key={tk._id} className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 flex justify-between items-center">
                              <div>
                                <div className="font-mono font-bold text-sm text-[#3FC7B8]">{tk.ticketCode}</div>
                                <div className="text-xs font-semibold text-[#F4EEDF]">{tk.userName}</div>
                                <div className="text-[10px] text-[#8FA096] font-mono">
                                  {tk.contact} · {new Date(tk.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <button
                                onClick={() => handleConfirmCheckinTicket(tk._id)}
                                className="bg-[#3FC7B8] text-[#04342C] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#3FC7B8]/90 transition"
                              >
                                Confirm
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUBTAB 2: BOOKING REQUESTS */}
                    {adminSubTab === 'bookings' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-xs text-[#FFC24B] font-mono uppercase">Room Booking Requests</h4>
                          <button onClick={fetchBookingRequests} className="text-[#3FC7B8] p-1">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {bookingRequests.length === 0 ? (
                          <div className="bg-[#223830] rounded-xl p-4 text-center text-xs text-[#8FA096]">
                            No reservation requests found
                          </div>
                        ) : (
                          bookingRequests.map((req) => (
                            <div key={req._id} className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-xs text-[#F4EEDF]">{req.roomId}</span>
                                  <div className="text-[11px] text-[#8FA096] font-mono">
                                    {req.requestedDate} @ {req.requestedSlot}
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                                    req.status === 'confirmed'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : req.status === 'rejected'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>
                              <div className="text-xs text-[#8FA096]">
                                User: <strong className="text-[#F4EEDF]">{req.contactName}</strong> ({req.contactEmail})
                              </div>
                              {req.status === 'pending' && (
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => handleConfirmBookingRequest(req._id)}
                                    className="flex-1 bg-[#3FC7B8] text-[#04342C] font-bold py-1 rounded-lg text-xs hover:bg-[#3FC7B8]/90"
                                  >
                                    Approve & Email
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectModalId(req._id);
                                      setRejectReason('');
                                    }}
                                    className="flex-1 bg-red-500/20 text-red-300 font-bold py-1 rounded-lg text-xs hover:bg-red-500/30"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUBTAB 3: ISSUES STATUS MANAGEMENT */}
                    {adminSubTab === 'issues' && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[#FFC24B] font-mono uppercase mb-2">Issues Management</h4>
                        {issues.map((iss) => (
                          <div key={iss._id} className="bg-[#223830] border border-[#2C4238] rounded-xl p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-xs text-[#F4EEDF]">{iss.title}</span>
                              <span
                                className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                                  iss.status === 'resolved'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : iss.status === 'seen'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {iss.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8FA096] mb-2">{iss.description}</p>
                            <div className="flex items-center gap-1.5 pt-2 border-t border-[#2C4238]">
                              <span className="text-[10px] text-[#8FA096] font-mono mr-auto">Set Status:</span>
                              <button
                                onClick={() => handleUpdateIssueStatus(iss._id, 'seen')}
                                className="px-2 py-1 rounded bg-[#12201B] text-[10px] font-mono text-[#8FA096] hover:text-[#F4EEDF]"
                              >
                                Seen
                              </button>
                              <button
                                onClick={() => handleUpdateIssueStatus(iss._id, 'pending')}
                                className="px-2 py-1 rounded bg-[#12201B] text-[10px] font-mono text-[#FFC24B] hover:text-[#F4EEDF]"
                              >
                                Pending
                              </button>
                              <button
                                onClick={() => handleUpdateIssueStatus(iss._id, 'resolved')}
                                className="px-2 py-1 rounded bg-emerald-600 text-[#04342C] font-bold text-[10px] font-mono"
                              >
                                Resolve
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SUBTAB 4: ANNOUNCEMENTS CRUD */}
                    {adminSubTab === 'announcements' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-xs text-[#FFC24B] font-mono uppercase">Announcements CRUD</h4>
                          <button
                            onClick={() => {
                              setEditingAnnoId(null);
                              setAnnoForm({ category: 'notice', title: '', description: '', imageUrl: '', sortOrder: 0 });
                              setAnnoModalOpen(true);
                            }}
                            className="bg-[#3FC7B8] text-[#04342C] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add New
                          </button>
                        </div>
                        {announcements.map((a) => (
                          <div key={a._id} className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#FFC24B] text-[#412402] font-bold mr-2">
                                {a.category}
                              </span>
                              <span className="font-bold text-xs text-[#F4EEDF]">{a.title}</span>
                              <p className="text-[11px] text-[#8FA096] truncate max-w-[200px]">{a.description}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingAnnoId(a._id);
                                  setAnnoForm({
                                    category: a.category,
                                    title: a.title,
                                    description: a.description || '',
                                    imageUrl: a.imageUrl || '',
                                    sortOrder: a.sortOrder || 0,
                                  });
                                  setAnnoModalOpen(true);
                                }}
                                className="p-1.5 text-[#3FC7B8] hover:bg-[#12201B] rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(a._id)}
                                className="p-1.5 text-red-400 hover:bg-[#12201B] rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SUBTAB 5: SMTP SETTINGS & TEST EMAIL */}
                    {adminSubTab === 'smtp' && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-xs text-[#FFC24B] font-mono uppercase">Gmail / SMTP Configuration</h4>
                        {smtpStatusMsg && (
                          <div
                            className={`p-2.5 rounded-xl text-xs font-mono ${
                              smtpStatusMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {smtpStatusMsg.msg}
                          </div>
                        )}
                        <form onSubmit={handleSaveSmtp} className="space-y-2.5 bg-[#223830] p-3 rounded-xl border border-[#2C4238]">
                          <div>
                            <label className="text-[10px] font-mono text-[#8FA096]">SMTP Host</label>
                            <input
                              type="text"
                              value={smtpForm.smtpHost}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                              className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] font-mono text-[#8FA096]">Port</label>
                              <input
                                type="number"
                                value={smtpForm.smtpPort}
                                onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: parseInt(e.target.value, 10) })}
                                className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                              <input
                                type="checkbox"
                                id="smtpSecure"
                                checked={smtpForm.smtpSecure}
                                onChange={(e) => setSmtpForm({ ...smtpForm, smtpSecure: e.target.checked })}
                              />
                              <label htmlFor="smtpSecure" className="text-xs text-[#8FA096] font-mono">
                                SSL/TLS
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-[#8FA096]">Gmail / SMTP User</label>
                            <input
                              type="text"
                              placeholder="user@gmail.com"
                              value={smtpForm.smtpUser}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                              className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-[#8FA096]">Gmail App Password</label>
                            <input
                              type="password"
                              placeholder="App password or secret"
                              value={smtpForm.smtpPass}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                              className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-[#3FC7B8] text-[#04342C] font-bold py-2 rounded-lg text-xs"
                          >
                            Save SMTP Configuration
                          </button>
                        </form>

                        {/* Test Email Section */}
                        <div className="bg-[#223830] p-3 rounded-xl border border-[#2C4238] space-y-2">
                          <h5 className="font-bold text-xs text-[#F4EEDF] font-mono">Send Test Email</h5>
                          <input
                            type="email"
                            placeholder="Recipient email for test"
                            value={testEmailAddr}
                            onChange={(e) => setTestEmailAddr(e.target.value)}
                            className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                          />
                          <button
                            type="button"
                            onClick={handleSendTestEmail}
                            className="w-full bg-[#FFC24B] text-[#412402] font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5" /> Send Test Email
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ========================================== */
              /* REGULAR MOBILE USER VIEW                   */
              /* ========================================== */
              <div>
                {/* 1. HOME TAB */}
                {activeTab === 'home' && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Day Pass Ticket */}
                    <div className="bg-[#F4EEDF] text-[#12201B] rounded-2xl p-5 relative shadow-xl">
                      {/* Ticket Cutouts */}
                      <div className="absolute w-5 h-5 bg-[#12201B] rounded-full -left-2.5 top-1/2 -translate-y-1/2"></div>
                      <div className="absolute w-5 h-5 bg-[#12201B] rounded-full -right-2.5 top-1/2 -translate-y-1/2"></div>

                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-mono text-[10px] text-[#8A6106] uppercase tracking-wider">
                            Today's Pass · Internet Lounge
                          </div>
                          <div className="font-serif font-bold text-base text-[#12201B]">
                            Adjei Business Hub
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif font-bold text-3xl text-[#12201B] leading-none">
                            {userProfile.streak || 14}
                          </div>
                          <div className="font-mono text-[9px] text-[#8FA096] uppercase">day streak</div>
                        </div>
                      </div>

                      {/* Perforation Line */}
                      <div className="border-t-2 border-dashed border-[#D9CDA9] my-4"></div>

                      {/* Punch Holes */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {Array.from({ length: 21 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-3 h-3 rounded-full ${
                              idx < (userProfile.streak || 14)
                                ? 'bg-[#12201B] shadow-inner'
                                : 'bg-transparent border border-dashed border-[#D9CDA9]'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Ticket Actions or Verification Panel */}
                      {!activeTicket ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Phone / Contact"
                              value={checkinContact}
                              onChange={(e) => setCheckinContact(e.target.value)}
                              className="w-full bg-[#E9E0C9] border border-[#D9CDA9] rounded-lg px-2 py-1 text-xs text-[#12201B] font-mono"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <label className="flex items-center gap-1.5 font-mono text-[11px] text-[#8FA096]">
                              <input
                                type="checkbox"
                                checked={isAnonCheckin}
                                onChange={(e) => setIsAnonCheckin(e.target.checked)}
                                className="accent-[#12201B]"
                              />
                              Stay anonymous
                            </label>
                            <button
                              onClick={handleStartCheckin}
                              disabled={isCheckingIn}
                              className="bg-[#12201B] text-[#F4EEDF] font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-[#1A2C24] active:scale-95 transition shadow"
                            >
                              <Ticket className="w-4 h-4 text-[#FFC24B]" />
                              {isCheckingIn ? 'Creating...' : 'Check In'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl p-3.5 mt-1 text-[#12201B] space-y-2 border border-[#E9E0C9]">
                          <div className="text-[10px] font-mono text-[#8FA096] uppercase">Your Ticket Token</div>
                          <div className="font-mono font-bold text-xl text-[#12201B] tracking-wider">
                            {activeTicket.ticketCode}
                          </div>
                          <div
                            className={`flex items-center gap-2 text-xs font-semibold ${
                              activeTicket.status === 'confirmed' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                activeTicket.status === 'confirmed' ? 'bg-emerald-600' : 'bg-amber-500 animate-ping'
                              }`}
                            ></span>
                            {activeTicket.status === 'confirmed'
                              ? 'Verified by desk staff — Checked in!'
                              : 'Waiting for staff confirmation at desk...'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Tiles */}
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setActiveTab('book')}
                        className="bg-[#223830] border border-[#2C4238] rounded-xl p-3.5 cursor-pointer hover:border-[#3FC7B8] transition"
                      >
                        <Calendar className="w-5 h-5 text-[#3FC7B8] mb-2" />
                        <div className="font-serif font-bold text-sm text-[#F4EEDF]">Book a room</div>
                        <div className="text-[10px] text-[#8FA096] mt-0.5">Seminar · Conf · Lab</div>
                      </div>
                      <div
                        onClick={() => setActiveTab('report')}
                        className="bg-[#223830] border border-[#2C4238] rounded-xl p-3.5 cursor-pointer hover:border-[#3FC7B8] transition"
                      >
                        <AlertTriangle className="w-5 h-5 text-[#FFC24B] mb-2" />
                        <div className="font-serif font-bold text-sm text-[#F4EEDF]">Report issue</div>
                        <div className="text-[10px] text-[#8FA096] mt-0.5">Wifi, AC, noise</div>
                      </div>
                    </div>

                    {/* Board Announcements Slider */}
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="font-serif font-bold text-sm text-[#F4EEDF]">On the board</span>
                        <button onClick={() => setActiveTab('board')} className="text-[11px] font-mono text-[#3FC7B8]">
                          view all →
                        </button>
                      </div>
                      <div className="relative rounded-2xl overflow-hidden bg-[#0A130F] h-40 shadow-inner">
                        {announcements.length > 0 ? (
                          <div className="relative w-full h-full">
                            <img
                              src={announcements[slideIndex]?.imageUrl || DEFAULT_SLIDE_IMG}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A130F] via-[#0A130F]/40 to-transparent p-3.5 flex flex-col justify-end">
                              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-[#FFC24B] text-[#412402] w-max mb-1">
                                {announcements[slideIndex]?.category || 'notice'}
                              </span>
                              <div className="font-serif font-bold text-sm text-white">
                                {announcements[slideIndex]?.title}
                              </div>
                              <div className="text-[11px] text-gray-200 font-mono truncate">
                                {announcements[slideIndex]?.description}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-[#8FA096]">
                            No active announcements
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Leaderboard Preview */}
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="font-serif font-bold text-sm text-[#F4EEDF]">Top Streaks</span>
                        <button onClick={() => setActiveTab('rank')} className="text-[11px] font-mono text-[#3FC7B8]">
                          leaderboard →
                        </button>
                      </div>
                      <div className="bg-[#223830] border border-[#2C4238] rounded-xl p-2 space-y-1">
                        {leaderboard.slice(0, 3).map((usr) => (
                          <div
                            key={usr._id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                              usr.deviceId === deviceId ? 'bg-[#1A2C24] border border-[#3FC7B8]/40' : ''
                            }`}
                          >
                            <span className="font-mono text-xs text-[#8FA096] w-4">{usr.rank}</span>
                            <div className="w-7 h-7 rounded-full bg-[#3FC7B8] flex items-center justify-center font-bold text-xs text-[#04342C]">
                              {usr.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="flex-1 text-xs text-[#F4EEDF] font-medium">{usr.name}</span>
                            <span className="font-mono text-xs text-[#FFC24B]">{usr.streak}d</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BOOK TAB */}
                {activeTab === 'book' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="font-serif font-bold text-base text-[#F4EEDF]">Book a room</h3>

                    {/* Room Cards */}
                    <div className="space-y-2.5">
                      {['Seminar Room 1', 'Conference Room', 'Training Lab'].map((rm) => (
                        <div
                          key={rm}
                          onClick={() => setSelectedRoom(rm)}
                          className={`bg-[#223830] border rounded-xl p-3.5 cursor-pointer transition ${
                            selectedRoom === rm ? 'border-[#3FC7B8] bg-[#1A2C24]' : 'border-[#2C4238]'
                          }`}
                        >
                          <div className="font-serif font-bold text-sm text-[#F4EEDF]">{rm}</div>
                          <div className="text-[11px] text-[#8FA096]">
                            {rm.includes('Seminar') && '24 seats · projector · whiteboard'}
                            {rm.includes('Conference') && '12 seats · video conferencing'}
                            {rm.includes('Training') && '18 workstations · Korean class venue'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Slot Picker */}
                    <div className="bg-[#223830] border border-[#2C4238] rounded-xl p-3.5 space-y-3">
                      <div className="font-serif font-bold text-xs text-[#F4EEDF]">
                        {selectedRoom} — Reservation Details
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8FA096]">Date</label>
                        <input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8FA096] mb-1 block">Time Slot</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'].map((s) => (
                            <button
                              key={s}
                              onClick={() => setSelectedSlot(s)}
                              className={`py-1.5 rounded-lg text-xs font-mono border transition ${
                                selectedSlot === s
                                  ? 'bg-[#3FC7B8] text-[#04342C] font-bold border-[#3FC7B8]'
                                  : 'bg-[#12201B] border-[#2C4238] text-[#8FA096]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8FA096]">Your Full Name</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#8FA096]">Contact Email (for confirmation)</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                        />
                      </div>

                      {bookingSubmitted ? (
                        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-center text-xs text-emerald-300 font-mono">
                          ✓ Booking request submitted! Staff will review and email confirmation.
                        </div>
                      ) : (
                        <button
                          onClick={handleConfirmBooking}
                          className="w-full bg-[#3FC7B8] text-[#04342C] font-bold py-2.5 rounded-xl text-xs hover:bg-[#3FC7B8]/90 transition"
                        >
                          Confirm Booking Request
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. BOARD TAB */}
                {activeTab === 'board' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="font-serif font-bold text-base text-[#F4EEDF]">Announcements Feed</h3>
                    <div className="space-y-3">
                      {announcements.map((a) => (
                        <div key={a._id} className="bg-[#223830] border border-[#2C4238] rounded-2xl overflow-hidden shadow">
                          {a.imageUrl && <img src={a.imageUrl} className="w-full h-32 object-cover" alt="" />}
                          <div className="p-4 space-y-1.5">
                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-[#FFC24B] text-[#412402]">
                              {a.category}
                            </span>
                            <h4 className="font-serif font-bold text-sm text-[#F4EEDF]">{a.title}</h4>
                            <p className="text-xs text-[#8FA096]">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. RANK TAB */}
                {activeTab === 'rank' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="font-serif font-bold text-base text-[#F4EEDF]">Lounge Leaderboard</h3>
                    <div className="bg-[#223830] border border-[#2C4238] rounded-xl p-2 space-y-1">
                      {leaderboard.map((usr) => (
                        <div
                          key={usr._id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                            usr.deviceId === deviceId ? 'bg-[#1A2C24] border border-[#3FC7B8]' : ''
                          }`}
                        >
                          <span className="font-mono text-xs text-[#8FA096] w-5">{usr.rank}</span>
                          <div className="w-8 h-8 rounded-full bg-[#3FC7B8] flex items-center justify-center font-bold text-xs text-[#04342C]">
                            {usr.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="flex-1 text-xs text-[#F4EEDF] font-semibold">{usr.name}</span>
                          <span className="font-mono text-xs text-[#FFC24B] font-bold">{usr.streak} days</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. REPORT TAB */}
                {activeTab === 'report' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="font-serif font-bold text-base text-[#F4EEDF]">Report an issue</h3>

                    {/* Quick Flag Preset Tiles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        onClick={() => handlePresetFlag('Slow wifi in lounge', 'Wifi')}
                        className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 text-center cursor-pointer hover:border-[#3FC7B8]"
                      >
                        <Wifi className="w-5 h-5 text-[#3FC7B8] mx-auto mb-1" />
                        <span className="font-bold text-xs text-[#F4EEDF]">Slow Wifi</span>
                      </div>
                      <div
                        onClick={() => handlePresetFlag('AC issue in seminar room', 'Facilities')}
                        className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 text-center cursor-pointer hover:border-[#3FC7B8]"
                      >
                        <Wind className="w-5 h-5 text-[#3FC7B8] mx-auto mb-1" />
                        <span className="font-bold text-xs text-[#F4EEDF]">AC Issue</span>
                      </div>
                      <div
                        onClick={() => handlePresetFlag('Noise levels high', 'Environment')}
                        className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 text-center cursor-pointer hover:border-[#3FC7B8]"
                      >
                        <Volume2 className="w-5 h-5 text-[#3FC7B8] mx-auto mb-1" />
                        <span className="font-bold text-xs text-[#F4EEDF]">Noise</span>
                      </div>
                      <div
                        onClick={() => handlePresetFlag('Missing check-in log', 'Check-in')}
                        className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 text-center cursor-pointer hover:border-[#3FC7B8]"
                      >
                        <Ticket className="w-5 h-5 text-[#3FC7B8] mx-auto mb-1" />
                        <span className="font-bold text-xs text-[#F4EEDF]">Missing Pass</span>
                      </div>
                    </div>

                    {/* Issue Submit Form */}
                    <form onSubmit={handleCreateIssue} className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 space-y-2">
                      <div className="font-serif font-bold text-xs text-[#F4EEDF]">Submit Custom Issue</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Issue title"
                          value={newIssueTitle}
                          onChange={(e) => setNewIssueTitle(e.target.value)}
                          className="flex-1 bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF]"
                          required
                        />
                        <select
                          value={newIssueCategory}
                          onChange={(e) => setNewIssueCategory(e.target.value)}
                          className="bg-[#12201B] border border-[#2C4238] rounded-lg px-2 py-1.5 text-xs text-[#F4EEDF]"
                        >
                          <option value="General">General</option>
                          <option value="Wifi">Wifi</option>
                          <option value="Facilities">Facilities</option>
                          <option value="Environment">Environment</option>
                          <option value="Check-in">Check-in</option>
                        </select>
                      </div>
                      <textarea
                        placeholder="Description (optional)"
                        value={newIssueDesc}
                        onChange={(e) => setNewIssueDesc(e.target.value)}
                        className="w-full bg-[#12201B] border border-[#2C4238] rounded-lg px-2.5 py-1.5 text-xs text-[#F4EEDF] h-16 resize-none"
                      />
                      <button
                        type="submit"
                        className="w-full bg-[#3FC7B8] text-[#04342C] font-bold py-2 rounded-lg text-xs"
                      >
                        File Report
                      </button>
                    </form>

                    {/* Open Issues List */}
                    <div className="space-y-2.5 pt-2">
                      <div className="font-serif font-bold text-xs text-[#F4EEDF]">Open on the board</div>
                      {issues.map((iss) => (
                        <div key={iss._id} className="bg-[#223830] border border-[#2C4238] rounded-xl p-3 space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-xs text-[#F4EEDF]">{iss.title}</div>
                              <div className="text-[10px] text-[#8FA096]">{iss.reporterName}</div>
                            </div>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                iss.status === 'resolved'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : iss.status === 'seen'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {iss.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              disabled={iss.status === 'resolved'}
                              onClick={() => handleVote(iss._id, 1)}
                              className={`px-2 py-1 rounded border text-xs font-mono transition ${
                                iss.myVote === 1
                                  ? 'bg-[#3FC7B8] text-[#04342C] border-[#3FC7B8]'
                                  : 'border-[#2C4238] text-[#8FA096] hover:text-[#F4EEDF]'
                              } ${iss.status === 'resolved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              ▲
                            </button>
                            <span className="font-mono text-xs text-[#F4EEDF] font-bold">{iss.netVotes}</span>
                            <button
                              disabled={iss.status === 'resolved'}
                              onClick={() => handleVote(iss._id, -1)}
                              className={`px-2 py-1 rounded border text-xs font-mono transition ${
                                iss.myVote === -1
                                  ? 'bg-red-500 text-white border-red-500'
                                  : 'border-[#2C4238] text-[#8FA096] hover:text-[#F4EEDF]'
                              } ${iss.status === 'resolved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              ▼
                            </button>
                            {iss.status === 'resolved' && (
                              <span className="text-[10px] font-mono text-emerald-400 ml-auto">
                                Voting locked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM MOBILE NAVIGATION BAR */}
          <div className="absolute bottom-3 left-3 right-3 bg-[#223830] border border-[#2C4238] rounded-2xl flex p-1.5 justify-around shadow-2xl">
            <button
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('home');
              }}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center text-[10px] font-mono transition ${
                activeTab === 'home' && !isAdminMode ? 'bg-[#F4EEDF] text-[#3A1200] font-bold' : 'text-[#8FA096]'
              }`}
            >
              <Coffee className="w-4 h-4 mb-0.5" />
              <span>home</span>
            </button>
            <button
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('book');
              }}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center text-[10px] font-mono transition ${
                activeTab === 'book' && !isAdminMode ? 'bg-[#F4EEDF] text-[#3A1200] font-bold' : 'text-[#8FA096]'
              }`}
            >
              <Calendar className="w-4 h-4 mb-0.5" />
              <span>book</span>
            </button>
            <button
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('board');
              }}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center text-[10px] font-mono transition ${
                activeTab === 'board' && !isAdminMode ? 'bg-[#F4EEDF] text-[#3A1200] font-bold' : 'text-[#8FA096]'
              }`}
            >
              <Sliders className="w-4 h-4 mb-0.5" />
              <span>board</span>
            </button>
            <button
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('rank');
              }}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center text-[10px] font-mono transition ${
                activeTab === 'rank' && !isAdminMode ? 'bg-[#F4EEDF] text-[#3A1200] font-bold' : 'text-[#8FA096]'
              }`}
            >
              <Trophy className="w-4 h-4 mb-0.5" />
              <span>rank</span>
            </button>
            <button
              onClick={() => {
                setIsAdminMode(false);
                setActiveTab('report');
              }}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center text-[10px] font-mono transition ${
                activeTab === 'report' && !isAdminMode ? 'bg-[#F4EEDF] text-[#3A1200] font-bold' : 'text-[#8FA096]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mb-0.5" />
              <span>report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Announcement Modal */}
      {annoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12201B] border border-[#2C4238] rounded-2xl max-w-sm w-full p-5 text-[#F4EEDF] space-y-4">
            <h3 className="font-bold text-sm text-[#FFC24B]">
              {editingAnnoId ? 'Edit Announcement' : 'New Announcement'}
            </h3>
            <form onSubmit={handleSaveAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-[#8FA096]">Category</label>
                <select
                  value={annoForm.category}
                  onChange={(e) => setAnnoForm({ ...annoForm, category: e.target.value as any })}
                  className="w-full bg-[#1A2C24] border border-[#2C4238] rounded-lg p-2 text-[#F4EEDF]"
                >
                  <option value="pinned">pinned</option>
                  <option value="event">event</option>
                  <option value="class">class</option>
                  <option value="notice">notice</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#8FA096]">Title</label>
                <input
                  type="text"
                  value={annoForm.title}
                  onChange={(e) => setAnnoForm({ ...annoForm, title: e.target.value })}
                  className="w-full bg-[#1A2C24] border border-[#2C4238] rounded-lg p-2 text-[#F4EEDF]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#8FA096]">Description</label>
                <textarea
                  value={annoForm.description}
                  onChange={(e) => setAnnoForm({ ...annoForm, description: e.target.value })}
                  className="w-full bg-[#1A2C24] border border-[#2C4238] rounded-lg p-2 text-[#F4EEDF] h-16"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#8FA096]">Image URL (optional)</label>
                <input
                  type="text"
                  value={annoForm.imageUrl}
                  onChange={(e) => setAnnoForm({ ...annoForm, imageUrl: e.target.value })}
                  className="w-full bg-[#1A2C24] border border-[#2C4238] rounded-lg p-2 text-[#F4EEDF]"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnnoModalOpen(false)}
                  className="flex-1 bg-[#223830] text-[#8FA096] py-2 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#3FC7B8] text-[#04342C] py-2 rounded-lg font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Booking Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12201B] border border-[#2C4238] rounded-2xl max-w-sm w-full p-5 text-[#F4EEDF] space-y-4">
            <h3 className="font-bold text-sm text-red-400">Reject Booking Request</h3>
            <p className="text-xs text-[#8FA096]">
              Please provide a reason for rejecting this reservation. An email notification will be sent automatically.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Slot unavailable or maintenance scheduled"
              className="w-full bg-[#1A2C24] border border-[#2C4238] rounded-lg p-2.5 text-xs text-[#F4EEDF] h-20 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="flex-1 bg-[#223830] text-[#8FA096] py-2 rounded-lg font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectBookingRequest}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
