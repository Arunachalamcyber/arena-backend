import mongoose from "mongoose";
const schema = new mongoose.Schema({
  title: String,
  desc: String,
  sampleIn: String,
  sampleOut: String,
  // optional: hidden tests
});
export default mongoose.model("Question", schema);
