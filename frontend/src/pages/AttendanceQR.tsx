import { useState } from 'react';
import { QrCode, Copy, Check } from 'lucide-react';
import QRCodeCanvas from 'qrcode';

export default function AttendanceQR() {
  const [label, setLabel] = useState('Daily General Attendance');
  const [duration, setDuration] = useState('8');
  const [qrToken, setQrToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    const token = 'IAC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const publicUrl = `${window.location.origin}/attendance-form?token=${token}`;
    setQrToken(token);

    try {
      const url = await QRCodeCanvas.toDataURL(publicUrl, { width: 280, margin: 2 });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const copyUrl = () => {
    const publicUrl = `${window.location.origin}/attendance-form?token=${qrToken}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-emerald-400" />
          Attendance QR Token Generator
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate timed QR codes for physical sign-in kiosk terminals.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Session Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Duration (Hours)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100"
          />
        </div>

        <button
          onClick={generateToken}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
        >
          Generate Active QR Kiosk Token
        </button>

        {qrDataUrl && (
          <div className="pt-4 border-t border-slate-800 flex flex-col items-center space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              <img src={qrDataUrl} alt="Attendance QR" className="w-52 h-52" />
            </div>
            <p className="font-mono text-xs text-emerald-400 font-bold">Token: {qrToken}</p>
            <button
              onClick={copyUrl}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Public Link!' : 'Copy Form Link'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
