"use client";
import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- Helper: Professional SVG Pie Chart ---
const StatusPieChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let cumulativePercent = 0;

  const colors = {
    'New': '#3b82f6', 
    'Contacted': '#8b5cf6', 
    'In Progress': '#f59e0b', 
    'Closed': '#10b981'
  };

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex items-center gap-8">
      <svg viewBox="-1 -1 2 2" className="w-40 h-40 -rotate-90 drop-shadow-md">
        {data.map((slice, index) => {
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += slice.count / total;
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = slice.count / total > 0.5 ? 1 : 0;
          const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
          return <path key={index} d={pathData} fill={colors[slice._id] || '#cbd5e1'} stroke="#fff" strokeWidth="0.01" />;
        })}
      </svg>
      <div className="space-y-2">
        {data.map((slice) => (
          <div key={slice._id} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[slice._id] || '#cbd5e1' }}></div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{slice._id}: **{slice.count}**</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR('/api/analytics', fetcher, { refreshInterval: 5000 });

  if (isLoading) return <div className="p-10 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Analytics...</div>;
  if (error) return <div className="p-10 text-red-500 font-bold">Error: Connection to database failed.</div>;

  const rate = data?.assignedLeads > 0 ? Math.round((data?.closedLeads / data?.assignedLeads) * 100) : 0;

  // --- AGENT VIEW ---
  if (session?.user?.role === "Agent") {
    return (
      <div className="p-8 bg-white min-h-screen">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-slate-800">Welcome, {session.user.name}</h2>
          <p className="text-slate-500 font-medium">Here is your personal performance overview.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 flex flex-col items-center shadow-sm">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6">Success Rate</p>
            <div className="relative h-32 w-32">
               <svg className="h-full w-full" viewBox="0 0 36 36">
                 <circle cx="18" cy="18" r="16" fill="none" className="text-slate-200" stroke="currentColor" strokeWidth="3" />
                 <circle cx="18" cy="18" r="16" fill="none" className="text-blue-600" stroke="currentColor" strokeWidth="3" 
                   strokeDasharray={`${rate}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-slate-800">{rate}%</div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">My Active Leads</h3>
              <p className="text-6xl font-black text-slate-800 mt-2">{data?.assignedLeads || 0}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Successfully Closed</h3>
              <p className="text-6xl font-black text-green-600 mt-2">{data?.closedLeads || 0}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-slate-800">Admin Analytics Overview</h2>
        <p className="text-slate-500 font-medium mt-1">Real-time pipeline data and agent performance tracking.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Total System Leads Card */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 font-bold uppercase text-[11px] tracking-wider">Total Leads</h3>
            <p className="text-7xl font-black text-slate-800 mt-2">{data?.totalLeads || 0}</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Total System Volume</p>
        </div>

        {/* Pipeline Distribution (Pie) */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-center">
           <h3 className="text-slate-500 font-bold uppercase text-[11px] tracking-wider mb-6">Leads by Status</h3>
           <StatusPieChart data={data?.statusDistribution} />
        </div>

        {/* Priority Distribution (Bar) */}
        <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-md">
           <h3 className="text-slate-500 font-bold uppercase text-[11px] tracking-wider mb-6">Leads by Priority</h3>
           <div className="space-y-6">
             {data?.priorityDistribution?.map((p) => (
               <div key={p._id}>
                 <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase">
                   <span className="text-slate-500">{p._id}</span>
                   <span className="text-slate-800">{p.count} leads</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full ${p._id === 'High' ? 'bg-red-500' : p._id === 'Medium' ? 'bg-yellow-500' : 'bg-slate-400'}`} 
                     style={{ width: `${data.totalLeads > 0 ? (p.count / data.totalLeads) * 100 : 0}%` }}
                   ></div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-lg font-bold text-slate-800">Agent Performance Overview</h3>
           <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Live Data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Agent Name</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Assigned</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Closed</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.agentPerformance?.map((agent, index) => {
                const agentRate = agent.totalAssigned > 0 ? Math.round((agent.closedLeads / agent.totalAssigned) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-800">{agent.name}</td>
                    <td className="px-8 py-6 text-center text-slate-600 font-medium">{agent.totalAssigned}</td>
                    <td className="px-8 py-6 text-center text-green-600 font-bold">{agent.closedLeads}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${agentRate > 70 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {agentRate > 70 ? 'A+' : agentRate > 40 ? 'B' : 'C'}
                        </span>
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden max-w-[120px]">
                          <div className="h-full bg-slate-800" style={{ width: `${agentRate}%` }}></div>
                        </div>
                        <span className="font-bold text-slate-900 text-xs w-8">{agentRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}