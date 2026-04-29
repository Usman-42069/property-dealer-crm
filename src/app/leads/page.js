"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import toast from "react-hot-toast";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LeadsPage() {
  const { data: session } = useSession();
  
  // Real-time polling every 3 seconds for live updates
  const { data: leads, mutate } = useSWR("/api/leads", fetcher, { refreshInterval: 3000 });
  const { data: agents } = useSWR(session?.user?.role === 'Admin' ? "/api/agents" : null, fetcher);
  
  // State for Modals and UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLogsId, setViewLogsId] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // State for Search and Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // State for creating a new lead
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    propertyInterest: "",
    budget: "",
    status: "New",
    followUpDate: ""
  });

  // Helper: Check if a date is overdue
  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateString) < today;
  };

  // BONUS: Heuristic AI Suggestion Engine
  const generateAISuggestion = (lead) => {
    let suggestion = "";
    if (lead.priority === "High" && lead.status === "New") {
      suggestion = `🚨 HIGH VALUE: Rs ${lead.budget.toLocaleString()} at stake. Call immediately!`;
    } else if (isOverdue(lead.followUpDate)) {
      suggestion = `⚠️ URGENT: Follow-up is overdue. WhatsApp them now.`;
    } else if (lead.status === "In Progress") {
      suggestion = `💡 WARM: Send property catalogs to close the deal.`;
    } else {
      suggestion = `👋 NEW: Send a welcome email and schedule a discovery call.`;
    }
    toast(suggestion, { icon: '🤖', duration: 4000 });
  };

  // BONUS: Export Leads to CSV (Excel)
  const exportToCSV = () => {
    if (!leads || leads.length === 0) return toast.error("No data to export");
    const headers = "Name,Email,Phone,Interest,Budget,Status,Follow Up\n";
    const rows = leads.map(l => 
      `"${l.name}","${l.email}","${l.phone}","${l.propertyInterest}",${l.budget},"${l.status}","${l.followUpDate || 'N/A'}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'crm_leads.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Exported to CSV!");
  };

  // API Call: Create Lead
  const handleCreateLead = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, budget: Number(formData.budget) }),
    });
    if (res.ok) {
      toast.success("Lead created!");
      setIsModalOpen(false);
      mutate(); // Refresh list
    } else {
      toast.error("Failed to create lead");
    }
  };

  // API Call: Update Status
  const handleStatusChange = async (id, newStatus) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success("Status Updated!");
      mutate();
    }
  };

  // API Call: Assign Agent (Admin Only)
  const handleAssignAgent = async (id, agentId) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo: agentId || null }),
    });
    if (res.ok) {
      toast.success("Agent Assigned!");
      mutate();
    }
  };

  // API Call: Fetch Timeline Logs
  const openTimeline = async (id) => {
    setViewLogsId(id);
    const res = await fetch(`/api/leads/${id}/logs`);
    const data = await res.json();
    setLogs(data);
  };

  // Filter Logic
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Leads Management</h2>
        <div className="space-x-3">
          <button onClick={exportToCSV} className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-green-700 transition-all font-semibold">
            📊 Export CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 transition-all font-semibold">
            + Add New Lead
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1 min-w-[250px]">
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full border border-slate-300 p-2.5 rounded-lg bg-white outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Pipeline Stages</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <table className="min-w-full text-left text-sm text-black">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider">Client Info</th>
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider">Property & Budget</th>
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider">Assignment</th>
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider">Follow-up</th>
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeads?.map((lead) => (
              <tr key={lead._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-5">
                  <p className="font-bold text-slate-900 text-base">{lead.name}</p>
                  <p className="text-slate-500 text-xs">{lead.email}</p>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline font-bold text-[11px] mt-1 inline-block">
                    💬 WhatsApp Client
                  </a>
                </td>
                <td className="px-6 py-5">
                  <p className="text-slate-700 font-medium">{lead.propertyInterest}</p>
                  <p className="font-extrabold text-slate-900">Rs {lead.budget.toLocaleString()}</p>
                  <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold ${
                    lead.priority === 'High' ? 'bg-red-100 text-red-700' :
                    lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {lead.priority} Priority
                  </span>
                </td>
                <td className="px-6 py-5">
                  <select 
                    value={lead.status} 
                    onChange={(e) => handleStatusChange(lead._id, e.target.value)} 
                    className="border border-slate-300 rounded-md px-2 py-1.5 bg-white text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>
                <td className="px-6 py-5">
                  {session?.user?.role === 'Admin' ? (
                    <select 
                      value={lead.assignedTo?._id || ""} 
                      onChange={(e) => handleAssignAgent(lead._id, e.target.value)} 
                      className="border border-blue-200 rounded-md px-2 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold outline-none"
                    >
                      <option value="">Unassigned</option>
                      {agents?.map(agent => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-slate-600 font-semibold">{lead.assignedTo?.name || "No Agent"}</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  {lead.followUpDate ? (
                    <div className="flex flex-col">
                      <span className={`font-bold ${isOverdue(lead.followUpDate) ? "text-red-600 bg-red-50 px-2 py-1 rounded w-fit" : "text-slate-600"}`}>
                        {new Date(lead.followUpDate).toLocaleDateString()}
                      </span>
                      {isOverdue(lead.followUpDate) && (
                        <span className="text-[10px] text-red-700 font-extrabold uppercase mt-1">⚠️ Overdue!</span>
                      )}
                    </div>
                  ) : <span className="text-slate-400 italic">Not Set</span>}
                </td>
                <td className="px-6 py-5 space-x-3">
                  <button onClick={() => openTimeline(lead._id)} className="text-blue-600 hover:text-blue-800 font-bold transition-colors">Timeline</button>
                  <button onClick={() => generateAISuggestion(lead)} className="text-purple-600 hover:text-purple-800 font-bold transition-colors text-xs border border-purple-200 px-2 py-1 rounded bg-purple-50">✨ AI Tip</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-slate-800">Add New Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <input required type="text" placeholder="Client Name" className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input required type="email" placeholder="Email Address" className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input required type="text" placeholder="Phone (e.g., 923001234567)" className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <input required type="text" placeholder="Property (e.g., 5 Marla Plot)" className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, propertyInterest: e.target.value})} />
              <input required type="number" placeholder="Budget in PKR" className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, budget: e.target.value})} />
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase">Follow-up Date</label>
                <input type="date" className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, followUpDate: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {viewLogsId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-2xl font-bold text-slate-800">Activity Timeline</h3>
              <button onClick={() => setViewLogsId(null)} className="text-3xl text-slate-400 hover:text-red-500 transition-colors">&times;</button>
            </div>
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              {logs.length > 0 ? logs.map(log => (
                <div key={log._id} className="relative pl-8 border-l-2 border-blue-500 pb-2">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{log.action}</p>
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">{log.details}</p>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-medium italic">No activity recorded for this lead yet.</p>
                  <p className="text-[10px] text-slate-300 mt-1">Updates to status or assignment will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}