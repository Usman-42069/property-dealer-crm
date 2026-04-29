"use client";
import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: session } = useSession();
  
  // Real-time polling every 5 seconds
  const { data, error, isLoading } = useSWR('/api/analytics', fetcher, { refreshInterval: 5000 });

  if (isLoading) return <p className="text-lg">Loading analytics data...</p>;
  if (error) return <p className="text-red-500">Failed to load analytics.</p>;

  // AGENT VIEW
  if (session?.user?.role === "Agent") {
    return (
      <div>
        <h2 className="text-3xl font-bold mb-6">Welcome, {session.user.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">My Active Leads</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{data?.assignedLeads}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Successfully Closed</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{data?.closedLeads}</p>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Admin Analytics Overview</h2>
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Leads in System</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">{data?.totalLeads}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Leads by Priority (Auto-Scored)</h3>
          <div className="space-y-4">
            {data?.priorityDistribution?.map((p) => (
              <div key={p._id} className="flex justify-between items-center border-b pb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  p._id === 'High' ? 'bg-red-100 text-red-800' : 
                  p._id === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>{p._id}</span>
                <span className="font-bold text-lg">{p.count} leads</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Leads by Status</h3>
          <div className="space-y-4">
            {data?.statusDistribution?.map((s) => (
              <div key={s._id} className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-700 font-medium">{s._id}</span>
                <span className="font-bold text-lg">{s.count} leads</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-4">Agent Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Agent Name</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Total Assigned</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Closed Leads</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.agentPerformance?.map((agent, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 font-medium text-gray-900">{agent.name}</td>
                  <td className="px-6 py-4">{agent.totalAssigned}</td>
                  <td className="px-6 py-4">{agent.closedLeads}</td>
                  <td className="px-6 py-4">
                    {agent.totalAssigned > 0 
                      ? Math.round((agent.closedLeads / agent.totalAssigned) * 100) + '%' 
                      : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}