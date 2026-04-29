import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import ActivityLog from '../../../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
export const dynamic = 'force-dynamic';


export async function GET(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    // Search by both raw ID and ObjectId to be 100% sure we find it
    const logs = await ActivityLog.find({
      $or: [
        { leadId: id },
        { leadId: new mongoose.Types.ObjectId(id) }
      ]
    })
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("🔥 FETCH LOGS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}