import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Lead from '../../../../models/Lead';
import ActivityLog from '../../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '../../../../lib/email';
import mongoose from 'mongoose';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { id } = await params;

    const oldLead = await Lead.findById(id);
    if (!oldLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const updatedLead = await Lead.findByIdAndUpdate(id, body, { new: true }).populate('assignedTo', 'name email');

    let logDetails = [];
    if (oldLead.status !== updatedLead.status) {
      logDetails.push(`Status changed from ${oldLead.status} to ${updatedLead.status}`);
    }
    
    // SAFE ID COMPARISON
    const oldAgentId = oldLead.assignedTo ? String(oldLead.assignedTo) : null;
    const newAgentId = updatedLead.assignedTo ? String(updatedLead.assignedTo._id) : null;
    
    if (oldAgentId !== newAgentId) {
      if (updatedLead.assignedTo) {
        logDetails.push(`Assigned to ${updatedLead.assignedTo.name}`);
        await sendEmail({
          to: updatedLead.assignedTo.email,
          subject: `New Lead Assigned: ${updatedLead.name}`,
          html: `<p>Admin assigned <strong>${updatedLead.name}</strong> to you.</p>`
        });
      } else {
        logDetails.push(`Lead unassigned`);
      }
    }

    if (logDetails.length > 0) {
      await ActivityLog.create({
        leadId: new mongoose.Types.ObjectId(id),
        action: 'Updated Lead',
        performedBy: new mongoose.Types.ObjectId(token.id),
        details: logDetails.join(', ')
      });
    }

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (error) {
    console.error("🔥 UPDATE CRASH:", error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const { id } = await params;
    await Lead.findByIdAndDelete(id);
    await ActivityLog.deleteMany({ leadId: id });
    return NextResponse.json({ message: 'Deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}