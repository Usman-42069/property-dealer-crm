"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeadsLayout({ children }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return <p className="p-8">Loading...</p>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">Property CRM</h1>
          <p className="text-sm text-slate-400 mt-1">Role: {session.user.role}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className={`block p-3 rounded-md transition ${pathname === '/dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Dashboard Overview
          </Link>
          <Link href="/leads" className={`block p-3 rounded-md transition ${pathname.startsWith('/leads') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            Manage Leads
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition">
            Log Out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto text-black">
        {children}
      </main>
    </div>
  );
}