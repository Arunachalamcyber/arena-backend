import { Router } from "express";
import Question from "../models/Question.js";
const r = Router();

// seed default if empty
r.post("/seed", async (_req, res)=>{
  const count = await Question.countDocuments();
  if(count) return res.json({ ok:true, count });
  const defaults = [
    {title:"Check if number is positive or negative", desc:"Given an integer, print Positive, Negative, or Zero.", sampleIn:"-5", sampleOut:"Negative"},
    {title:"Find the largest of two numbers", desc:"Read two integers and print the larger one.", sampleIn:"4 9", sampleOut:"9"},
    {title:"Check whether a number is even or odd", desc:"Given an integer, print Even or Odd.", sampleIn:"3", sampleOut:"Odd"},
    {title:"Find the sum of digits", desc:"Print the sum of digits of a non-negative integer.", sampleIn:"1234", sampleOut:"10"},
    {title:"Eligible to vote or not", desc:"Given age, print Eligible if age >= 18 else Not Eligible.", sampleIn:"16", sampleOut:"Not Eligible"},
  ];
  await Question.insertMany(defaults);
  res.json({ ok:true, inserted: defaults.length });
});

r.get("/", async (_req, res)=> res.json(await Question.find({}).lean()));
r.post("/", async (req, res)=> res.json(await Question.create(req.body)));
r.put("/:id", async (req, res)=> res.json(await Question.findByIdAndUpdate(req.params.id, req.body, { new:true })));
r.delete("/:id", async (req, res)=> { await Question.findByIdAndDelete(req.params.id); res.json({ ok:true }); });

export default r;
