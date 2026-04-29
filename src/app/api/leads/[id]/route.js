import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import ActivityLog from '../../../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

export async function GET(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    // Aggressive matching: Search by raw string AND ObjectId
    const query = {
      $or: [
        { leadId: id },
        { leadId: new mongoose.Types.ObjectId(id) }
      ]
    };

    const logs = await ActivityLog.find(query)
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 });

    console.log(`🔍 Found ${logs.length} logs for Lead ID: ${id}`);
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("🔥 Timeline Fetch Error:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}