import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Lead from '../../../../models/Lead';
import ActivityLog from '../../../../models/ActivityLog';
import { getToken } from 'next-auth/jwt';
import { sendEmail } from '../../../../lib/email';

export async function PUT(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { id } = await params;

    const oldLead = await Lead.findById(id);
    if (!oldLead) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const updatedLead = await Lead.findByIdAndUpdate(id, body, { new: true }).populate('assignedTo', 'name email');

    let logDetails = [];
    if (body.status && oldLead.status !== body.status) {
      logDetails.push(`Status changed from ${oldLead.status} to ${body.status}`);
    }

    const oldAssignedTo = oldLead.assignedTo ? oldLead.assignedTo.toString() : null;
    const newAssignedTo = body.assignedTo ? body.assignedTo.toString() : null;

    if (newAssignedTo && oldAssignedTo !== newAssignedTo) {
      logDetails.push(`Assigned to ${updatedLead.assignedTo?.name}`);
      if (updatedLead.assignedTo?.email) {
        await sendEmail({
          to: updatedLead.assignedTo.email,
          subject: 'New Lead Assigned - Property CRM',
          html: `<h3>New Lead Assignment</h3><p>Hello ${updatedLead.assignedTo.name},</p><p>A new lead (<b>${updatedLead.name}</b>) has just been assigned to you.</p><p>Log in to your dashboard to view details.</p>`
        });
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
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await dbConnect();
  const { id } = await params;
  await Lead.findByIdAndDelete(id);
  await ActivityLog.deleteMany({ leadId: new mongoose.Types.ObjectId(id) });
  return NextResponse.json({ message: 'Deleted' }, { status: 200 });
}