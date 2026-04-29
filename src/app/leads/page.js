"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import toast from "react-hot-toast";

// Standard Fetcher for SWR
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LeadsPage() {
  const { data: session } = useSession();
  
  // Real-time polling every 3 seconds to keep data fresh across Admin/Agent views
  const { data: leads, mutate } = useSWR("/api/leads", fetcher, { 
    refreshInterval: 3000 
  });
  
  // Only fetch agents if the user is an Admin
  const { data: agents } = useSWR(
    session?.user?.role === 'Admin' ? "/api/agents" : null, 
    fetcher
  );
  
  // --- UI STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewLogsId, setViewLogsId] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // --- SEARCH & FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    name: "", 
    email: "", 
    phone: "", 
    propertyInterest: "", 
    budget: "", 
    status: "New", 
    followUpDate: ""
  });

  /**
   * Helper: Check if a date is before today
   */
  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
    return new Date(dateString) < today;
  };

  /**
   * BONUS: Heuristic AI Smart Suggestion Engine
   * Provides detailed, context-aware advice based on Lead status and budget.
   */
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
    
    toast(suggestion, { 
      icon: '🤖', 
      duration: 6000, 
      style: { 
        background: '#f0f9ff', 
        color: '#0369a1', 
        maxWidth: '500px', 
        fontWeight: 'bold',
        border: '1px solid #bae6fd'
      } 
    });
  };

  /**
   * BONUS: Export to CSV (Excel Compatible)
   */
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
    link.setAttribute("download", "property_crm_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Exported to Excel/CSV!");
  };

  /**
   * API: Create Lead
   */
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
      mutate(); // Refresh the SWR cache
    } else {
      toast.error("Failed to create lead");
    }
  };

  /**
   * API: Update Pipeline Status
   */
  const handleStatusChange = async (id, newStatus) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (res.ok) { 
      toast.success("Status updated!"); 
      mutate(); 
    }
  };

  /**
   * API: Assign Agent to Lead
   */
  const handleAssignAgent = async (id, agentId) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo: agentId || null }),
    });
    
    if (res.ok) { 
      toast.success("Lead assignment updated!"); 
      mutate(); 
    }
  };

  /**
   * API: Delete Lead (Admin Only)
   */
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    
    if (res.ok) { 
      toast.success("Lead deleted successfully"); 
      mutate(); 
    } else {
      toast.error("Unauthorized or Delete Failed");
    }
  };

  /**
   * API: Fetch Activity Logs for Timeline
   */
  const openTimeline = async (id) => {
    setViewLogsId(id);
    const res = await fetch(`/api/leads/${id}/logs`);
    const data = await res.json();
    setLogs(data);
  };

  // --- FILTERING LOGIC ---
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || lead.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      
      {/* Header with Page Title and Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Leads Management</h2>
        <div className="space-x-3">
          <button 
            onClick={exportToCSV} 
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-green-700 font-bold transition-all"
          >
            📊 Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 font-bold transition-all"
          >
            + Add New Lead
          </button>
        </div>
      </div>

      {/* Search Bar & Pipeline Filter */}
      <div className="flex gap-4 mb-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          className="flex-1 border border-slate-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="border border-slate-300 p-3 rounded-xl bg-white font-bold outline-none cursor-pointer"
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

      {/* Main Leads Data Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <table className="min-w-full text-left text-sm text-black">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Lead Info</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Interest & Budget</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Priority & AI</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Assignment</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Follow-up</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeads?.map((lead) => (
              <tr key={lead._id} className="hover:bg-slate-50 transition-colors">
                
                {/* 1. Lead Info */}
                <td className="px-6 py-5">
                  <p className="font-extrabold text-slate-900 text-base">{lead.name}</p>
                  <p className="text-slate-500 text-xs">{lead.email}</p>
                  <a 
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-green-600 hover:underline font-black text-[11px] mt-2 inline-block"
                  >
                    💬 WHATSAPP CLIENT
                  </a>
                </td>

                {/* 2. Interest & Budget */}
                <td className="px-6 py-5">
                  <p className="text-slate-700 font-medium">{lead.propertyInterest}</p>
                  <p className="font-black text-slate-900">Rs {lead.budget.toLocaleString()}</p>
                </td>

                {/* 3. Priority & AI Button */}
                <td className="px-6 py-5">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase block w-max mb-2 ${
                    lead.priority === 'High' ? 'bg-red-100 text-red-700' :
                    lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {lead.priority} Priority
                  </span>
                  <button 
                    onClick={() => generateAISuggestion(lead)} 
                    className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-200 font-black transition-all"
                  >
                    ✨ ASK AI TIP
                  </button>
                </td>

                {/* 4. Pipeline Status Dropdown */}
                <td className="px-6 py-5">
                  <select 
                    value={lead.status} 
                    onChange={(e) => handleStatusChange(lead._id, e.target.value)} 
                    className="border border-slate-300 rounded-md px-2 py-1.5 bg-white text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>

                {/* 5. Agent Assignment (Admin Only) */}
                <td className="px-6 py-5">
                  {session?.user?.role === 'Admin' ? (
                    <select 
                      value={lead.assignedTo?._id || ""} 
                      onChange={(e) => handleAssignAgent(lead._id, e.target.value)} 
                      className="border border-blue-200 rounded-md px-2 py-1.5 bg-blue-50 text-blue-900 text-xs font-bold outline-none cursor-pointer w-full"
                    >
                      <option value="">Unassigned</option>
                      {agents?.map(agent => (
                        <option key={agent._id} value={agent._id}>{agent.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-600 font-bold">{lead.assignedTo?.name || "No Agent"}</span>
                  )}
                </td>

                {/* 6. Follow-up Status with Red Flags */}
                <td className="px-6 py-5">
                  {lead.followUpDate ? (
                    <div className="flex flex-col">
                      <span className={`font-black ${isOverdue(lead.followUpDate) ? "text-red-600 bg-red-50 px-2 py-1 rounded w-fit" : "text-slate-700"}`}>
                        {new Date(lead.followUpDate).toLocaleDateString()}
                      </span>
                      {isOverdue(lead.followUpDate) && (
                        <span className="text-[10px] text-red-700 font-extrabold uppercase mt-1 tracking-tighter">
                          ⚠️ Overdue Action!
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300 italic">Not Scheduled</span>
                  )}
                </td>

                {/* 7. Action Buttons (Timeline & Delete) */}
                <td className="px-6 py-5 space-x-3">
                  <button 
                    onClick={() => openTimeline(lead._id)} 
                    className="text-blue-600 hover:text-blue-800 font-black transition-colors underline decoration-2"
                  >
                    Timeline
                  </button>
                  {session?.user?.role === 'Admin' && (
                    <button 
                      onClick={() => handleDelete(lead._id)} 
                      className="text-red-600 hover:text-red-800 font-black transition-colors underline decoration-2"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredLeads?.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-12 text-slate-400 italic font-medium">
                  No leads found matching your search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD NEW LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-slate-800">Add New Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <input 
                required type="text" placeholder="Full Client Name" 
                className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
              <input 
                required type="email" placeholder="Email Address" 
                className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
              <input 
                required type="text" placeholder="Phone (e.g., 923001234567)" 
                className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
              <input 
                required type="text" placeholder="Property Interest (e.g., 5 Marla Plot)" 
                className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={(e) => setFormData({...formData, propertyInterest: e.target.value})} 
              />
              <input 
                required type="number" placeholder="Budget in PKR" 
                className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                onChange={(e) => setFormData({...formData, budget: e.target.value})} 
              />
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 uppercase">Follow-up Schedule</label>
                <input 
                  type="date" 
                  className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                  onChange={(e) => setFormData({...formData, followUpDate: e.target.value})} 
                />
              </div>
              <div className="flex justify-end space-x-3 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-lg transition-all"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVITY TIMELINE MODAL */}
      {viewLogsId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-2xl font-black text-slate-800">Activity Timeline</h3>
              <button 
                onClick={() => setViewLogsId(null)} 
                className="text-slate-400 hover:text-red-500 text-3xl font-light transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              {logs.length > 0 ? logs.map(log => (
                <div key={log._id} className="relative pl-8 border-l-2 border-blue-500 pb-2">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p className="font-extrabold text-slate-800 mt-0.5">
                    {log.action} <span className="font-medium text-slate-400 text-xs">by {log.performedBy?.name || 'System'}</span>
                  </p>
                  <p className="text-slate-600 text-xs mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                    {log.details}
                  </p>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-medium italic">No activity recorded for this lead yet.</p>
                  <p className="text-[10px] text-slate-300 mt-1 uppercase font-bold tracking-wider">
                    Updates to status or assignment will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}