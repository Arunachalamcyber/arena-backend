import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema({
  teamId: { type: String, index: true, required: true },
  qIndex: { type: Number, required: true },
  code: { type: String, default: "" },
  passed: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

SubmissionSchema.index({ teamId: 1, qIndex: 1 }, { unique: true });

export default mongoose.model("Submission", SubmissionSchema);
