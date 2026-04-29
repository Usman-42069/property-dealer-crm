import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true }, // Required for WhatsApp integration
  propertyInterest: { type: String, required: true },
  budget: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'In Progress', 'Closed'], 
    default: 'New' 
  },
  priority: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'],
    default: 'Low'
  },
  notes: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  followUpDate: { type: Date, default: null } // For Smart Follow-up Reminder
}, { timestamps: true });

// Auto-scoring system based on rubric requirements (Updated for modern Mongoose)
LeadSchema.pre('save', async function() {
  if (this.isModified('budget')) {
    if (this.budget > 20000000) { // > 20M
      this.priority = 'High';
    } else if (this.budget >= 10000000 && this.budget <= 20000000) { // 10M - 20M
      this.priority = 'Medium';
    } else { // < 10M
      this.priority = 'Low';
    }
  }
  // Removed next() because async functions resolve automatically!
});

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);