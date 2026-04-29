import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Lead from '../../../models/Lead';
import { getToken } from 'next-auth/jwt';
export const dynamic = 'force-dynamic';


export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    // If Agent, return basic stats for their own dashboard
    if (token.role === 'Agent') {
      const assignedLeads = await Lead.countDocuments({ assignedTo: token.id });
      const closedLeads = await Lead.countDocuments({ assignedTo: token.id, status: 'Closed' });
      return NextResponse.json({ assignedLeads, closedLeads }, { status: 200 });
    }

    // If Admin, run complex aggregations
    const totalLeads = await Lead.countDocuments();
    
    const statusDistribution = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const priorityDistribution = await Lead.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);
    
    const agentPerformance = await Lead.aggregate([
      { 
        $group: { 
          _id: "$assignedTo", 
          totalAssigned: { $sum: 1 }, 
          closedLeads: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } } 
        } 
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "agentInfo" } },
      { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } },
      { 
        $project: { 
          name: { $ifNull: ["$agentInfo.name", "Unassigned"] }, 
          totalAssigned: 1, 
          closedLeads: 1 
        } 
      }
    ]);

    return NextResponse.json({ totalLeads, statusDistribution, priorityDistribution, agentPerformance }, { status: 200 });
  } catch (error) {
    // Added this so we can see exact errors in the VS Code terminal!
    console.error("ANALYTICS API CRASH:", error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}