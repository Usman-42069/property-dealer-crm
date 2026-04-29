import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Lead from '../../../models/Lead';
import ActivityLog from '../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '../../../lib/email';

export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    let query = {};
    if (token.role === 'Agent') { query.assignedTo = token.id; }
    const leads = await Lead.find(query).populate('assignedTo', 'name email').sort({ createdAt: -1 });
    return NextResponse.json(leads, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await req.json();
    const newLead = await Lead.create(body);

    await ActivityLog.create({
      leadId: newLead._id,
      action: 'Created Lead',
      performedBy: new mongoose.Types.ObjectId(token.id),
      details: `Lead ${newLead.name} was created.`
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}