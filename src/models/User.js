import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Agent'], default: 'Agent' },
}, { timestamps: true });

// Hash password before saving (Updated for modern Mongoose)
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return; // Simply return instead of calling next()
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // Removed next() entirely because async functions resolve automatically!
});

export default mongoose.models.User || mongoose.model('User', UserSchema);