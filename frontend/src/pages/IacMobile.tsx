import { Smartphone } from 'lucide-react';

export default function IacMobile() {
  return (
    <div className="p-8 max-w-7xl mx-auto transition-opacity duration-500 ease-in-out opacity-100">
      <header className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-white rounded-xl border border-zinc-200/60 shadow-sm">
          <Smartphone className="w-6 h-6 text-zinc-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Iac Mobile</h1>
          <p className="text-zinc-500 text-sm mt-1">Mobile application management and configurations.</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 min-h-[400px] flex items-center justify-center">
        {/* Intentionally left blank */}
      </div>
    </div>
  );
}
