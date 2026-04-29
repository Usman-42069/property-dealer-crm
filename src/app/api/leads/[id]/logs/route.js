import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../lib/mongodb';
import ActivityLog from '../../../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';

export async function GET(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await params;

    const logs = await ActivityLog.find({
      leadId: new mongoose.Types.ObjectId(id)
    })
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 });

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}