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
  
  // BONUS: Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", propertyInterest: "", budget: "", status: "New", followUpDate: ""
  });

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  // BONUS: AI Smart Suggestion Engine
  const generateAISuggestion = (lead) => {
    let suggestion = "";
    if (lead.priority === "High" && lead.status === "New") {
      suggestion = `🚨 HIGH VALUE TARGET: This client has a massive budget of Rs ${lead.budget.toLocaleString()} for a ${lead.propertyInterest}. Call immediately. Do NOT use email. Pitch exclusive, off-market properties to match their spending power.`;
    } else if (isOverdue(lead.followUpDate)) {
      suggestion = `⚠️ URGENT FOLLOW-UP: You missed the follow-up on ${new Date(lead.followUpDate).toLocaleDateString()}. Send a WhatsApp immediately apologizing for the delay and offer a virtual tour of a ${lead.propertyInterest} to regain their attention.`;
    } else if (lead.status === "In Progress") {
      suggestion = `💡 WARM LEAD: They are interested. Send them a comparative market analysis (CMA) of other properties similar to the ${lead.propertyInterest} to create a sense of urgency.`;
    } else {
      suggestion = `👋 STANDARD ENGAGEMENT: Send a welcome packet via email and schedule a brief 5-minute discovery call to narrow down their exact requirements for a ${lead.propertyInterest}.`;
    }
    toast(suggestion, { icon: '🤖', duration: 6000, style: { background: '#f0f9ff', color: '#0369a1', maxWidth: '500px' } });
  };

  // BONUS: Export to CSV (Excel)
  const exportToCSV = () => {
    if (!leads || leads.length === 0) return toast.error("No data to export");
    
    const headers = ["Name,Email,Phone,Interest,Budget,Priority,Status,Follow Up Date,Assigned Agent"];
    const rows = leads.map(l => 
      `"${l.name}","${l.email}","${l.phone}","${l.propertyInterest}",${l.budget},"${l.priority}","${l.status}","${l.followUpDate ? new Date(l.followUpDate).toLocaleDateString() : 'None'}","${l.assignedTo?.name || 'Unassigned'}"`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "crm_leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported to Excel/CSV!");
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, budget: Number(formData.budget) }),
    });
    if (res.ok) {
      toast.success("Lead created successfully!");
      setIsModalOpen(false);
      mutate();
    } else {
      toast.error("Failed to create lead");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast.success("Status updated!"); mutate(); }
  };

  const handleAssignAgent = async (id, agentId) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo: agentId || null }),
    });
    if (res.ok) { toast.success("Lead assignment updated!"); mutate(); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Lead deleted"); mutate(); }
  };

  const openTimeline = async (id) => {
    setViewLogsId(id);
    const res = await fetch(`/api/leads/${id}/logs`);
    const data = await res.json();
    setLogs(data);
  };

  // Apply Search and Filter
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Leads Management</h2>
        <div className="space-x-3">
          <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
            📊 Export CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
            + Add New Lead
          </button>
        </div>
      </div>

      {/* BONUS: Search & Filter Bar */}
      <div className="flex gap-4 mb-4 bg-white p-4 rounded shadow border border-gray-200">
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          className="flex-1 border p-2 rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="border p-2 rounded bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 font-semibold text-gray-600">Lead Info</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Interest & Budget</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Priority & AI</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Assignment</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLeads?.map((lead) => (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{lead.name}</p>
                  <p className="text-gray-500">{lead.email}</p>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline font-semibold flex items-center mt-1">
                    💬 WhatsApp
                  </a>
                </td>
                <td className="px-6 py-4">
                  <p>{lead.propertyInterest}</p>
                  <p className="font-bold text-gray-700">Rs {lead.budget.toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold block w-max mb-2 ${
                    lead.priority === 'High' ? 'bg-red-100 text-red-800' :
                    lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.priority}
                  </span>
                  <button onClick={() => generateAISuggestion(lead)} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-300 hover:bg-purple-200 font-semibold">
                    ✨ Ask AI
                  </button>
                </td>
                <td className="px-6 py-4">
                  <select value={lead.status} onChange={(e) => handleStatusChange(lead._id, e.target.value)} className="border border-gray-300 rounded px-2 py-1 bg-white">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  {session?.user?.role === 'Admin' ? (
                    <select value={lead.assignedTo?._id || ""} onChange={(e) => handleAssignAgent(lead._id, e.target.value)} className="border border-blue-300 rounded px-2 py-1 bg-blue-50 text-blue-900 w-full">
                      <option value="">Unassigned</option>
                      {agents?.map(agent => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-700 font-medium">{lead.assignedTo?.name || "Unassigned"}</span>
                  )}
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button onClick={() => openTimeline(lead._id)} className="text-blue-600 hover:underline">Timeline</button>
                  {session?.user?.role === 'Admin' && (
                    <button onClick={() => handleDelete(lead._id)} className="text-red-600 hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {filteredLeads?.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No leads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-3">
              <input required type="text" placeholder="Full Name" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input required type="email" placeholder="Email" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input required type="text" placeholder="Phone (e.g., 923001234567)" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <input required type="text" placeholder="Property Interest (e.g., 5 Marla Plot)" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, propertyInterest: e.target.value})} />
              <input required type="number" placeholder="Budget in PKR" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, budget: e.target.value})} />
              <div>
                <label className="block text-sm text-gray-600 mb-1">Follow-up Date</label>
                <input type="date" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, followUpDate: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewLogsId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Activity Timeline</h3>
              <button onClick={() => setViewLogsId(null)} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
            </div>
            <div className="space-y-4 border-l-2 border-blue-200 pl-4 ml-2">
              {logs.length > 0 ? logs.map(log => (
                <div key={log._id} className="relative">
                  <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-blue-500 border-4 border-white"></div>
                  <p className="text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="font-semibold">{log.action} <span className="font-normal text-gray-600">by {log.performedBy?.name}</span></p>
                  <p className="text-gray-700 text-sm mt-1 bg-gray-50 p-2 rounded border">{log.details}</p>
                </div>
              )) : <p className="text-gray-500">No activity recorded yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}