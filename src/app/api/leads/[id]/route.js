import { NextResponse } from 'next/server';
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
    
    // Fix for Next.js 15+ routing requirement
    const { id } = await params; 

    const oldLead = await Lead.findById(id);
    if (!oldLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const updatedLead = await Lead.findByIdAndUpdate(id, body, { new: true }).populate('assignedTo', 'name email');

    // Audit Trail Logic
    let logDetails = [];
    if (oldLead.status !== updatedLead.status) logDetails.push(`Status changed to ${updatedLead.status}`);
    if (oldLead.notes !== updatedLead.notes) logDetails.push(`Notes updated`);
    
    // Safely extract the IDs to compare them (This is what was crashing!)
    const oldAgentId = oldLead.assignedTo ? String(oldLead.assignedTo) : null;
    const newAgentId = updatedLead.assignedTo ? String(updatedLead.assignedTo._id) : null;

    // Assignment Notification Logic
    if (oldAgentId !== newAgentId) {
      if (updatedLead.assignedTo) {
        logDetails.push(`Assigned to ${updatedLead.assignedTo.name}`);
        // Email the newly assigned agent
        await sendEmail({
          to: updatedLead.assignedTo.email,
          subject: `New Lead Assigned: ${updatedLead.name}`,
          html: `<h3>You have a new lead!</h3><p>Admin has assigned <strong>${updatedLead.name}</strong> to you.</p>`
        });
      } else {
        logDetails.push(`Unassigned from agent`);
      }
    }

    if (logDetails.length > 0) {
      await ActivityLog.create({
        leadId: updatedLead._id,
        action: 'Updated Lead',
        performedBy: token.id,
        details: logDetails.join(', ')
      });
    }

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (error) {
    console.error("🔥 UPDATE LEAD CRASH:", error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized (Admins Only)' }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    await Lead.findByIdAndDelete(id);
    await ActivityLog.deleteMany({ leadId: id }); // Clean up logs

    return NextResponse.json({ message: 'Lead deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("🔥 DELETE LEAD CRASH:", error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}