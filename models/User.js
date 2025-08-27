import mongoose from "mongoose";
const schema = new mongoose.Schema({
  teamId: { type: String, unique: true, index: true },
  m1: String,
  m2: String,
  points: { type: Number, default: 0 },
  currentQ: { type: Number, default: 0 },
  submitted: { type: Map, of: Boolean, default: {} },
  loginAt: { type: Date, default: Date.now },
  exitAt: { type: Date }
});
export default mongoose.model("User", schema);
