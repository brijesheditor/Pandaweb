require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  completedLessons: [{ type: String }]
}, { timestamps: true });

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 140 },
  videoUrl: { type: String, default: "" },
  notesUrl: { type: String, default: "" },
  duration: { type: String, default: "10 min" }
}, { _id: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  level: { type: String, default: "Beginner" },
  description: { type: String, default: "", maxlength: 2000 },
  thumbnail: { type: String, default: "" },
  featured: { type: Boolean, default: false },
  lessons: [lessonSchema],
  resources: [{ title: String, url: String }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Course = mongoose.model("Course", courseSchema);

function makeToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role,
    enrolledCourses: user.enrolledCourses || [], completedLessons: user.completedLessons || [] };
}
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Please log in first." });
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "Account not found." });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: "Session expired. Please log in again." }); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}
function validHttpUrl(value) {
  if (!value) return true;
  try { const u = new URL(value); return u.protocol === "https:" || u.protocol === "http:"; }
  catch { return false; }
}

const sampleCourses = [
  {
    title: "HTML & CSS Starter",
    category: "Web Development", level: "Beginner", featured: true,
    description: "Learn the building blocks of the web with beginner-friendly public resources.",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    lessons: [
      { title: "HTML basics — MDN learning area", videoUrl: "https://www.youtube.com/embed/UB1O30fR-EE", notesUrl: "https://developer.mozilla.org/en-US/docs/Learn/HTML", duration: "15 min" },
      { title: "CSS basics — MDN learning area", videoUrl: "https://www.youtube.com/embed/yfoY53QXEnI", notesUrl: "https://developer.mozilla.org/en-US/docs/Learn/CSS", duration: "20 min" },
      { title: "Responsive web design — freeCodeCamp", videoUrl: "https://www.youtube.com/embed/srvUrASNj0s", notesUrl: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", duration: "25 min" }
    ],
    resources: [
      { title: "MDN HTML Guide", url: "https://developer.mozilla.org/en-US/docs/Learn/HTML" },
      { title: "MDN CSS Guide", url: "https://developer.mozilla.org/en-US/docs/Learn/CSS" }
    ]
  },
  {
    title: "JavaScript Fundamentals",
    category: "Programming", level: "Beginner", featured: true,
    description: "Start programming with JavaScript using public documentation and lessons.",
    thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
    lessons: [
      { title: "JavaScript introduction", videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk", notesUrl: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps", duration: "18 min" },
      { title: "Variables and data types", videoUrl: "https://www.youtube.com/embed/hdI2bqOjy3c", notesUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", duration: "22 min" }
    ],
    resources: [{ title: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }]
  },
  {
    title: "Python for Beginners",
    category: "Programming", level: "Beginner", featured: true,
    description: "Explore Python fundamentals through free public lessons and the official tutorial.",
    thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80",
    lessons: [
      { title: "Python beginner course", videoUrl: "https://www.youtube.com/embed/rfscVS0vtbw", notesUrl: "https://docs.python.org/3/tutorial/", duration: "30 min" },
      { title: "Python official tutorial", videoUrl: "", notesUrl: "https://docs.python.org/3/tutorial/", duration: "Reading" }
    ],
    resources: [{ title: "Official Python Tutorial", url: "https://docs.python.org/3/tutorial/" }]
  },
  {
    title: "Computer & Internet Basics",
    category: "Computer Basics", level: "Beginner", featured: false,
    description: "A starter path for understanding the web, browsers and basic computer concepts.",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    lessons: [
      { title: "How the web works", videoUrl: "https://www.youtube.com/embed/7_LPdttKXPc", notesUrl: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web", duration: "12 min" },
      { title: "Getting started with the web", videoUrl: "", notesUrl: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web", duration: "Reading" }
    ],
    resources: [{ title: "MDN: Getting started with the web", url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web" }]
  }
];

async function seedCourses() {
  const count = await Course.countDocuments();
  if (count === 0) {
    await Course.insertMany(sampleCourses);
    console.log("Sample free-resource courses added.");
  }
}
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.log("Admin not seeded: set ADMIN_EMAIL and ADMIN_PASSWORD in environment.");
    return;
  }
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: "PandaLearn Admin", email,
      passwordHash: await bcrypt.hash(password, 12), role: "admin"
    });
    console.log("Admin account created from environment variables.");
  } else if (user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
}

app.get("/api/health", (req, res) => res.json({
  status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
}));

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ error: "Name must be at least 2 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    if (await User.findOne({ email })) return res.status(409).json({ error: "Email already registered. Please log in." });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: "Could not create account." }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch { res.status(500).json({ error: "Could not log in." }); }
});

app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post("/api/auth/logout", auth, (req, res) => res.json({ ok: true }));

app.get("/api/courses", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const filter = {};
    if (q) filter.$or = [{ title: new RegExp(escapeRegex(q), "i") }, { description: new RegExp(escapeRegex(q), "i") }];
    if (category && category !== "All") filter.category = category;
    const courses = await Course.find(filter).sort({ featured: -1, createdAt: -1 }).lean();
    res.json({ courses: courses.map(c => ({ ...c, lessonCount: c.lessons.length })) });
  } catch { res.status(500).json({ error: "Could not load courses." }); }
});
app.get("/api/courses/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid course ID." });
  const course = await Course.findById(req.params.id).lean();
  if (!course) return res.status(404).json({ error: "Course not found." });
  res.json({ course });
});
app.post("/api/courses/:id/enroll", auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid course ID." });
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!req.user.enrolledCourses.some(id => id.toString() === course._id.toString())) {
    req.user.enrolledCourses.push(course._id);
    await req.user.save();
  }
  res.json({ ok: true, user: publicUser(req.user) });
});
app.post("/api/progress/:courseId/:lessonId", auth, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ error: "Course not found." });
  const lesson = course.lessons.id(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: "Lesson not found." });
  if (!req.user.enrolledCourses.some(id => id.toString() === course._id.toString())) {
    return res.status(403).json({ error: "Enroll in this free course first." });
  }
  const key = `${course._id}:${lesson._id}`;
  if (!req.user.completedLessons.includes(key)) req.user.completedLessons.push(key);
  await req.user.save();
  res.json({ ok: true, completedLessons: req.user.completedLessons });
});

app.get("/api/admin/stats", auth, adminOnly, async (req, res) => {
  res.json({ students: await User.countDocuments({ role: "student" }), courses: await Course.countDocuments() });
});
app.post("/api/admin/courses", auth, adminOnly, async (req, res) => {
  try {
    const data = sanitizeCourse(req.body);
    if (!data.title || !data.category) return res.status(400).json({ error: "Title and category are required." });
    const course = await Course.create(data);
    res.status(201).json({ course });
  } catch (e) { res.status(400).json({ error: e.message || "Invalid course data." }); }
});
app.put("/api/admin/courses/:id", auth, adminOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid course ID." });
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, sanitizeCourse(req.body), { new: true, runValidators: true });
    if (!course) return res.status(404).json({ error: "Course not found." });
    res.json({ course });
  } catch (e) { res.status(400).json({ error: e.message || "Could not update course." }); }
});
app.delete("/api/admin/courses/:id", auth, adminOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid course ID." });
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found." });
  await User.updateMany({}, { $pull: { enrolledCourses: course._id } });
  res.json({ ok: true });
});
app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  const users = await User.find({ role: "student" }).select("name email createdAt enrolledCourses").sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
});

function sanitizeCourse(body) {
  const lessons = Array.isArray(body.lessons) ? body.lessons.slice(0, 100).map(l => {
    if (!validHttpUrl(l.videoUrl || "") || !validHttpUrl(l.notesUrl || "")) throw new Error("Lesson URLs must be http or https.");
    return { title: String(l.title || "Lesson").trim().slice(0, 140), videoUrl: String(l.videoUrl || "").trim(), notesUrl: String(l.notesUrl || "").trim(), duration: String(l.duration || "10 min").slice(0, 30) };
  }) : [];
  const resources = Array.isArray(body.resources) ? body.resources.slice(0, 30).map(r => {
    if (!validHttpUrl(r.url || "")) throw new Error("Resource URLs must be http or https.");
    return { title: String(r.title || "Resource").slice(0, 120), url: String(r.url || "").trim() };
  }) : [];
  if (!validHttpUrl(body.thumbnail || "")) throw new Error("Thumbnail must be an http or https URL.");
  return {
    title: String(body.title || "").trim().slice(0, 140),
    category: String(body.category || "").trim().slice(0, 60),
    level: String(body.level || "Beginner").slice(0, 40),
    description: String(body.description || "").slice(0, 2000),
    thumbnail: String(body.thumbnail || "").trim(),
    featured: Boolean(body.featured), lessons, resources
  };
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

async function start() {
  if (!JWT_SECRET || JWT_SECRET.length < 24) {
    console.error("Set JWT_SECRET to a random string of at least 24 characters.");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in environment variables.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected.");
  await seedCourses();
  await seedAdmin();
  app.listen(PORT, "0.0.0.0", () => console.log(`PandaLearn running on port ${PORT}`));
}
start().catch(err => { console.error("Startup failed:", err.message); process.exit(1); });
