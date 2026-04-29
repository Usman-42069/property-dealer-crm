import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { getToken } from 'next-auth/jwt';

export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    // Security: Only Admins can fetch the agent list
    if (!token || token.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const agents = await User.find({ role: 'Agent' }).select('name email');
    return NextResponse.json(agents, { status: 200 });
  } catch (error) {
    console.error("🔥 FETCH AGENTS CRASH:", error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}