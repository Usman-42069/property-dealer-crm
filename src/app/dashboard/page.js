"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import toast from "react-hot-toast";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LeadsPage() {
  const { data: session } = useSession();
  const { data: leads, mutate } = useSWR("/api/leads", fetcher, { refreshInterval: 3000 });
  const { data: agents } = useSWR(session?.user?.role === 'Admin' ? "/api/agents" : null, fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLogsId, setViewLogsId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", propertyInterest: "", budget: "", status: "New", followUpDate: ""
  });

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateString) < today;
  };

  const generateAISuggestion = (lead) => {
    let msg = lead.priority === "High" ? "🚨 High priority! Call immediately." : "👋 Standard lead. Send intro email.";
    toast(msg, { icon: '🤖' });
  };

  const exportToCSV = () => {
    const headers = "Name,Email,Phone,Interest,Budget,Status\n";
    const rows = leads.map(l => `${l.name},${l.email},${l.phone},${l.propertyInterest},${l.budget},${l.status}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
  };

  const handleStatusChange = async (id, newStatus) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast.success("Status Updated!"); mutate(); }
  };

  const handleAssignAgent = async (id, agentId) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo: agentId || null }),
    });
    if (res.ok) { toast.success("Agent Assigned!"); mutate(); }
  };

  const openTimeline = async (id) => {
    setViewLogsId(id);
    const res = await fetch(`/api/leads/${id}/logs`);
    const data = await res.json();
    setLogs(data);
  };

  const filteredLeads = leads?.filter(l => 
    (l.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === "All" || l.status === filterStatus)
  );

  return (
    <div className="p-4">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Leads Management</h2>
        <div className="space-x-2">
          <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded">Export CSV</button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Lead</button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <input type="text" placeholder="Search..." className="border p-2 rounded flex-1" onChange={e => setSearchTerm(e.target.value)} />
        <select className="border p-2 rounded" onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full text-left text-sm text-black">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignment</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLeads?.map(lead => (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                   <p className="font-bold">{lead.name}</p>
                   <button onClick={() => generateAISuggestion(lead)} className="text-[10px] text-purple-600 font-bold">✨ AI TIP</button>
                </td>
                <td className="px-4 py-4">Rs {lead.budget.toLocaleString()}</td>
                <td className="px-4 py-4">
                  <select value={lead.status} onChange={e => handleStatusChange(lead._id, e.target.value)} className="border rounded p-1">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>
                <td className="px-4 py-4">
                  {session?.user?.role === 'Admin' ? (
                    <select value={lead.assignedTo?._id || ""} onChange={e => handleAssignAgent(lead._id, e.target.value)} className="border rounded p-1">
                      <option value="">Unassigned</option>
                      {agents?.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  ) : <span>{lead.assignedTo?.name || "None"}</span>}
                </td>
                <td className="px-4 py-4">
                  {lead.followUpDate ? (
                    <span className={isOverdue(lead.followUpDate) ? "text-red-600 font-bold" : "text-gray-600"}>
                      {new Date(lead.followUpDate).toLocaleDateString()}
                      {isOverdue(lead.followUpDate) && " (Overdue!)"}
                    </span>
                  ) : "No date"}
                </td>
                <td className="px-4 py-4 space-x-2">
                  <button onClick={() => openTimeline(lead._id)} className="text-blue-600 hover:underline">Timeline</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline Modal */}
      {viewLogsId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between mb-4 border-b pb-2">
              <h3 className="font-bold">Activity Timeline</h3>
              <button onClick={() => setViewLogsId(null)} className="text-xl">&times;</button>
            </div>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {logs.length > 0 ? logs.map(log => (
                <div key={log._id} className="border-l-2 border-blue-500 pl-3">
                  <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-semibold text-black">{log.action}</p>
                  <p className="text-xs text-gray-600">{log.details}</p>
                </div>
              )) : <p className="text-gray-500">No activity yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}