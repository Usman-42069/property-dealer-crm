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

    // We use a flexible query to find logs by String or ObjectId
    const logs = await ActivityLog.find({ 
      leadId: id 
    })
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("Timeline Fetch Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}