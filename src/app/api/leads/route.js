import { NextResponse } from 'next/server';
import mongoose from 'mongoose'; // Added this
import dbConnect from '../../../lib/mongodb';
import Lead from '../../../models/Lead';
import ActivityLog from '../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '../../../lib/email';

// GET ALL LEADS (Admin sees all, Agent sees assigned)
export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let query = {};
    if (token.role === 'Agent') {
      query.assignedTo = token.id;
    }

    const leads = await Lead.find(query).populate('assignedTo', 'name email').sort({ createdAt: -1 });
    return NextResponse.json(leads, { status: 200 });
  } catch (error) {
    console.error("🔥 GET LEADS CRASH:", error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// CREATE NEW LEAD
export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    const newLead = await Lead.create(body);

    // 1. Log the Activity - Fixed with ObjectId conversion
    try {
      await ActivityLog.create({
        leadId: newLead._id,
        action: 'Created Lead',
        performedBy: new mongoose.Types.ObjectId(token.id), // Forced ObjectId
        details: `Lead ${newLead.name} was created.`
      });
    } catch (logErr) {
      console.error("🔥 LOGGING FAILED ON CREATE:", logErr);
    }

    // 2. Send Email Notification
    await sendEmail({
      to: token.email,
      subject: `New Lead Created: ${newLead.name}`,
      html: `<h3>New Lead Alert</h3><p>A new lead (<strong>${newLead.name}</strong>) has entered the system with a budget of ${newLead.budget}.</p>`
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error("🔥 CREATE LEAD CRASH:", error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}