import { useState } from 'react';
import { Monitor, Cpu } from 'lucide-react';

interface DeviceItem {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'busy';
  ip: string;
}

export default function Devices() {
  const [devices] = useState<DeviceItem[]>([
    { id: '1', name: 'LAB-PC-01', location: 'Training Lab', status: 'online', ip: '192.168.1.101' },
    { id: '2', name: 'LAB-PC-02', location: 'Training Lab', status: 'online', ip: '192.168.1.102' },
    { id: '3', name: 'LOUNGE-TERM-01', location: 'Internet Lounge', status: 'online', ip: '192.168.1.50' },
    { id: '4', name: 'SEM-DISP-01', location: 'Seminar Room 1', status: 'busy', ip: '192.168.1.80' },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Monitor className="w-6 h-6 text-sky-400" />
          Device Control & Monitoring
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitor workstation nodes and remote display controllers across the center.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {devices.map((dev) => (
          <div key={dev.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-slate-800 rounded-lg text-sky-400">
                <Cpu className="w-4 h-4" />
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  dev.status === 'online'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : dev.status === 'busy'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {dev.status}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-100 text-sm">{dev.name}</h3>
              <p className="text-xs text-slate-400">{dev.location}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-1">{dev.ip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
