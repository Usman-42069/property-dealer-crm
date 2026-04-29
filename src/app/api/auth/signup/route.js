import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { z } from "zod";

// Validation Schema
const signupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Admin", "Agent"]).default("Agent"),
});

export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Safely check the form data
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      // This is the line that was crashing earlier! It is now safe.
      const errorMessage = validationResult.error.errors?.[0]?.message || "Invalid form data";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { name, email, password, role } = validationResult.data;

    // 2. Connect to DB (We know this works!)
    await dbConnect();

    // 3. Check for duplicates (We know this works too!)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    // 4. Create the new user
    const newUser = await User.create({ name, email, password, role });

    return NextResponse.json({ message: "User registered successfully", userId: newUser._id }, { status: 201 });
  } catch (error) {
    // If it still crashes, this will print the exact reason to your terminal with a fire emoji so it's easy to spot
    console.error("🔥 SIGNUP CRASH REASON:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}