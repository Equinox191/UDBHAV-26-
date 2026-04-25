// ─────────────────────────────────────────────
//  Aarambh · Backend Server
//  Stack : Node.js + Express + MongoDB (Atlas)
//  Port  : 3000
// ─────────────────────────────────────────────
//
//  SETUP (ek baar karo):
//  1. npm init -y
//  2. npm install express mongoose cors dotenv
//  3. .env file banao (neeche format diya hai)
//  4. node server.js
//
//  .env format:
//  ┌─────────────────────────────────────────────────────┐
//  │ MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxx  │
//  │           .mongodb.net/aarambh?retryWrites=true     │
//  │ PORT=3000                                           │
//  └─────────────────────────────────────────────────────┘
//
//  MongoDB Atlas free tier steps:
//  1. atlas.mongodb.com → Sign up (free)
//  2. Create Cluster (M0 Free)
//  3. Database Access → Add user + password
//  4. Network Access → Add IP → 0.0.0.0/0 (allow all)
//  5. Connect → Drivers → Copy URI → paste in .env
// ─────────────────────────────────────────────

require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────
app.use(cors({ origin: "*" }));   // frontend se calls allow
app.use(express.json());

// ── MongoDB Connect ──────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ════════════════════════════════════════════
//  SCHEMAS & MODELS
// ════════════════════════════════════════════

// ── Chat Message Schema ──────────────────────
// Ek "session" = ek reset ke beech ka poora chat
const messageSchema = new mongoose.Schema({
  sessionId : { type: String, required: true },   // random UUID from frontend
  role      : { type: String, enum: ["user", "assistant"], required: true },
  content   : { type: String, required: true },
  level     : { type: String, default: "beginner" }, // beginner / advanced
  timestamp : { type: Date,   default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// ── Quiz Result Schema ───────────────────────
const quizResultSchema = new mongoose.Schema({
  sessionId    : { type: String, required: true },
  topics       : [String],                          // jo topics select kiye
  totalQ       : Number,
  score        : Number,
  accuracy     : Number,                            // percentage
  topicResults : { type: Map, of: new mongoose.Schema({
    correct: Number,
    total  : Number
  }, { _id: false })},
  timestamp    : { type: Date, default: Date.now }
});
const QuizResult = mongoose.model("QuizResult", quizResultSchema);

// ════════════════════════════════════════════
//  ROUTES — CHAT
// ════════════════════════════════════════════

// POST /api/chat/save — ek message save karo
// Body: { sessionId, role, content, level }
app.post("/api/chat/save", async (req, res) => {
  try {
    const { sessionId, role, content, level } = req.body;
    if (!sessionId || !role || !content) {
      return res.status(400).json({ error: "sessionId, role, content required" });
    }
    const msg = await Message.create({ sessionId, role, content, level });
    res.json({ success: true, id: msg._id });
  } catch (err) {
    console.error("Chat save error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/history?sessionId=xxx — session ki history lao
app.get("/api/chat/history", async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    const msgs = await Message.find({ sessionId }).sort({ timestamp: 1 });
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/sessions — saari sessions ki list (latest first)
app.get("/api/chat/sessions", async (req, res) => {
  try {
    const sessions = await Message.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: {
          _id         : "$sessionId",
          firstMsg    : { $last:  "$content" },   // pehla user message
          lastActivity: { $first: "$timestamp" },
          msgCount    : { $sum: 1 }
      }},
      { $sort: { lastActivity: -1 } },
      { $limit: 20 }
    ]);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  ROUTES — QUIZ
// ════════════════════════════════════════════

// POST /api/quiz/save — quiz result save karo
// Body: { sessionId, topics, totalQ, score, topicResults }
app.post("/api/quiz/save", async (req, res) => {
  try {
    const { sessionId, topics, totalQ, score, topicResults } = req.body;
    if (!sessionId || score === undefined || !totalQ) {
      return res.status(400).json({ error: "sessionId, score, totalQ required" });
    }
    const accuracy = Math.round((score / totalQ) * 100);
    const result   = await QuizResult.create({
      sessionId, topics, totalQ, score, accuracy, topicResults
    });
    res.json({ success: true, id: result._id, accuracy });
  } catch (err) {
    console.error("Quiz save error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quiz/history — saare quiz results (latest first)
app.get("/api/quiz/history", async (req, res) => {
  try {
    const results = await QuizResult.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quiz/analysis — topic-wise cumulative accuracy
app.get("/api/quiz/analysis", async (req, res) => {
  try {
    const all = await QuizResult.find();
    const map = {};   // topic → { correct, total }

    all.forEach(result => {
      if (!result.topicResults) return;
      result.topicResults.forEach((val, topic) => {
        if (!map[topic]) map[topic] = { correct: 0, total: 0 };
        map[topic].correct += val.correct || 0;
        map[topic].total   += val.total   || 0;
      });
    });

    const analysis = Object.entries(map).map(([topic, val]) => ({
      topic,
      correct  : val.correct,
      total    : val.total,
      accuracy : val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0
    })).sort((a, b) => a.accuracy - b.accuracy);   // weakest first

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ─────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status : "Aarambh server chal raha hai ✅",
    routes : {
      chat : ["POST /api/chat/save", "GET /api/chat/history", "GET /api/chat/sessions"],
      quiz : ["POST /api/quiz/save", "GET /api/quiz/history", "GET /api/quiz/analysis"]
    }
  });
});

// ── Start ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});