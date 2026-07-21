
import { Users, MonitorPlay, ServerCrash, AlertCircle, ArrowUpRight, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="p-10 transition-opacity duration-500 ease-in-out opacity-100">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Platform Overview</h1>
        <p className="text-zinc-500 mt-2 text-sm max-w-xl">Live monitoring across all interconnected facilities and endpoints.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Metric Cards */}
        <div className="group bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300/80 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-zinc-100 transition-colors">
              <Users className="w-5 h-5 text-zinc-700" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              12%
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-500 mb-1">Lounge Activity</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-zinc-900 tracking-tight">12</p>
            <span className="text-sm font-medium text-zinc-400">active now</span>
          </div>
        </div>

        <div className="group bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300/80 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-zinc-100 transition-colors">
              <MonitorPlay className="w-5 h-5 text-zinc-700" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-500 mb-1">Rooms & Labs</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-zinc-900 tracking-tight">4</p>
            <span className="text-sm font-medium text-zinc-400">in session</span>
          </div>
        </div>

        <div className="group bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300/80 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-zinc-100 transition-colors">
              <ServerCrash className="w-5 h-5 text-zinc-700" />
            </div>
            <span className="flex items-center text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded-full">
              Stable
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-500 mb-1">Connected Devices</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-zinc-900 tracking-tight">128</p>
            <span className="text-sm font-medium text-zinc-400">online</span>
          </div>
        </div>

        <div className="group bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md hover:border-zinc-300/80 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-rose-50 rounded-2xl group-hover:bg-rose-100 transition-colors">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
              Action Req.
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-500 mb-1">Pending Reports</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-zinc-900 tracking-tight">3</p>
            <span className="text-sm font-medium text-zinc-400">unreviewed</span>
          </div>
        </div>
      </div>

      {/* Main Feature Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-8 min-h-[400px] flex flex-col">
          <h3 className="font-semibold text-zinc-900 mb-6 tracking-tight">System Activity Matrix</h3>
          <div className="flex-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 flex items-center justify-center">
             <p className="text-sm text-zinc-400 font-medium">Activity visualization will render here.</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-8 min-h-[400px] flex flex-col">
          <h3 className="font-semibold text-zinc-900 mb-6 tracking-tight">Recent Events</h3>
          <div className="flex-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 flex items-center justify-center">
             <p className="text-sm text-zinc-400 font-medium">Event log will render here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
