const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
let courses = [], currentCategory = "All", currentUser = null, currentCourse = null;
let activeLesson = 0, toastTimer;
const tokenKey = "pand​​alearn_token".replace("\u200b","");
const getToken = () => localStorage.getItem(tokenKey);
const safe = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api = async (url, options={}) => {
  const headers = { "Content-Type":"application/json", ...(options.headers||{}) };
  if (getToken()) headers.Authorization = "Bearer " + getToken();
  const res = await fetch(url, {...options, headers});
  const data = await res.json().catch(()=>({error:"Unexpected server response."}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
};
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3000);}
function closeModal(){$("#modalBackdrop").classList.add("hidden");$("#modalContent").innerHTML="";}
function openModal(html, wide=false){$("#modalContent").innerHTML=html;$("#modalBackdrop").classList.remove("hidden");$(".modal").classList.toggle("modal-wide",wide);}
function setLoggedIn(user){currentUser=user;$("#loginBtn").classList.toggle("hidden",!!user);$("#signupBtn").classList.toggle("hidden",!!user);$("#profileBtn").classList.toggle("hidden",!user);$("#profileBtn").textContent=user?(user.name||"B").slice(0,1).toUpperCase():"B";}
async function init(){
  $("#year").textContent=new Date().getFullYear();
  $("#mobileMenu").addEventListener("click",()=>$("#navLinks").classList.toggle("open"));
  $("#courseSearch").addEventListener("input",()=>renderCourses());
  $$("#categoryFilters .filter").forEach(b=>b.addEventListener("click",()=>{currentCategory=b.dataset.category;$$("#categoryFilters .filter").forEach(x=>x.classList.toggle("active",x===b));renderCourses();}));
  try { if(getToken()){const d=await api("/api/auth/me");setLoggedIn(d.user);} } catch {localStorage.removeItem(tokenKey);}
  try {const d=await api("/api/courses");courses=d.courses;renderCourses();} catch(e){$("#courseGrid").innerHTML=`<div class="empty-state">Could not load courses. Check your server and database setup.<br><small>${safe(e.message)}</small></div>`;}
}
function renderCourses(){
  const q=($("#courseSearch")?.value||"").trim().toLowerCase();
  const list=courses.filter(c=>(currentCategory==="All"||c.category===currentCategory)&&(`${c.title} ${c.description} ${c.category}`).toLowerCase().includes(q));
  $("#courseGrid").innerHTML=list.length?list.map(c=>`
    <article class="course-card" onclick="openCourse('${c._id}')">
      <div class="course-thumb"><img loading="lazy" src="${safe(c.thumbnail||"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80")}" alt="${safe(c.title)}" onerror="this.style.display='none'"><span class="course-badge">${safe(c.category)}</span><span class="course-open">↗</span></div>
      <div class="course-content"><div class="course-meta"><span>${safe(c.level||"Beginner")}</span><span>◷ ${c.lessonCount ?? (c.lessons||[]).length} lessons</span></div><h3>${safe(c.title)}</h3><p>${safe(c.description||"Start learning with free public resources.")}</p><div class="course-foot"><span>↗ Open learning path</span><span class="free-label">FREE</span></div></div>
    </article>`).join(""):`<div class="empty-state">No courses found. Try a different search.</div>`;
}
function goHome(){window.scrollTo({top:0,behavior:"smooth"});$("#navLinks").classList.remove("open");}
function goCourses(){closeModal();$("#courses").scrollIntoView({behavior:"smooth"});$("#navLinks").classList.remove("open");}
function showResources(){closeModal();$("#resources").scrollIntoView({behavior:"smooth"});$("#navLinks").classList.remove("open");}
function openAuth(mode){
  const isReg=mode==="register";
  openModal(`<div class="eyebrow">WELCOME TO PANDLEARN</div><h2 id="modalTitle">${isReg?"Create your free account":"Welcome back"}</h2><p>${isReg?"Join the learning community and save your progress.":"Log in to continue your learning journey."}</p>
  <form class="form-stack" id="authForm">${isReg?'<label>Your name<input name="name" required minlength="2" maxlength="60" placeholder="Enter your name"></label>':""}
  <label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
  <label>Password<input name="password" type="password" required minlength="8" autocomplete="${isReg?"new-password":"current-password"}" placeholder="At least 8 characters"></label>
  <button class="btn btn-primary" type="submit">${isReg?"Create account":"Log in"} <span>→</span></button>
  <div class="form-hint">${isReg?"Already registered?":"New to PandaLearn?"} <span class="modal-switch" onclick="openAuth('${isReg?"login":"register"}')">${isReg?"Log in":"Create account"}</span></div></form>`);
  $("#authForm").addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const body=Object.fromEntries(fd.entries());const submit=$("button[type=submit]",e.currentTarget);submit.disabled=true;try{const d=await api(`/api/auth/${isReg?"register":"login"}`,{method:"POST",body:JSON.stringify(body)});localStorage.setItem(tokenKey,d.token);setLoggedIn(d.user);closeModal();toast(isReg?"Account created!":"Welcome back!");if(currentCourse)openCourse(currentCourse._id);else showDashboard();}catch(err){toast(err.message);}finally{submit.disabled=false;}});
}
async function openCourse(id){
  try{
    const d=await api(`/api/courses/${id}`);currentCourse=d.course;activeLesson=0;const c=currentCourse;
    const enrolled=!!currentUser&&(currentUser.enrolledCourses||[]).some(x=>String(x)===String(c._id));
    openModal(`<div class="detail-hero"><div><div class="eyebrow">${safe(c.category)} · ${safe(c.level||"Beginner")}</div><h2 id="modalTitle">${safe(c.title)}</h2><p>${safe(c.description)}</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:15px"><button class="btn btn-primary" id="enrollBtn">${enrolled?"✓ Enrolled":"Enroll for free"}</button><span class="free-label" style="align-self:center">FREE LEARNING PATH</span></div></div><img src="${safe(c.thumbnail||"")}" alt="" onerror="this.style.display='none'"></div>
    <div id="lessonPlayer">${renderPlayer(c,0,enrolled)}</div>
    <h3 style="font:700 15px Manrope;margin:24px 0 10px">Course lessons (${(c.lessons||[]).length})</h3><div class="lesson-list">${(c.lessons||[]).map((l,i)=>`<div class="lesson-row"><span class="lesson-number">${i+1}</span><div class="lesson-info"><b>${safe(l.title)}</b><small>${safe(l.duration||"Lesson")}</small></div><div class="lesson-actions">${l.videoUrl?`<button class="mini-btn" onclick="playLesson(${i})">▶ Play</button>`:""}${l.notesUrl?`<button class="mini-btn" onclick="openExternal('${safe(l.notesUrl)}')">↗ Notes</button>`:""}</div></div>`).join("")||'<p>No lessons have been added yet.</p>'}</div>
    ${(c.resources||[]).length?`<h3 style="font:700 15px Manrope;margin:24px 0 10px">More free resources</h3>${c.resources.map(r=>`<p><a class="text-link" target="_blank" rel="noopener" href="${safe(r.url)}">${safe(r.title)} ↗</a></p>`).join("")}`:""}`,true);
    $("#enrollBtn").onclick=()=>enrollCourse(c._id);
  }catch(e){toast(e.message);}
}
function renderPlayer(c,index,enrolled){
  const lesson=(c.lessons||[])[index];
  if(!lesson)return `<div class="empty-state">Lessons will appear here when available.</div>`;
  let video=lesson.videoUrl||"";
  // Only embed YouTube URLs. Other authorized URLs open separately.
  const match=video.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  const frame=match?`<iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/${match[1]}" title="${safe(lesson.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`:
    `<div class="video-frame" style="display:grid;place-items:center;padding:22px;text-align:center;color:var(--muted)">${video?`<div>This resource opens on its original website.<br><br><button class="btn btn-outline" onclick="openExternal('${safe(video)}')">Open lesson ↗</button></div>`:"No video added for this lesson. Use the notes link below."}</div>`;
  return `<div style="font-size:12px;font-weight:700;margin-top:12px">${safe(lesson.title)}</div>${frame}<div style="display:flex;gap:9px;flex-wrap:wrap">${lesson.notesUrl?`<button class="btn btn-outline" onclick="openExternal('${safe(lesson.notesUrl)}')">Open notes / reading ↗</button>`:""}${enrolled?`<button class="btn btn-primary" onclick="markComplete('${c._id}','${lesson._id}')">Mark lesson complete ✓</button>`:`<span style="font-size:10px;color:var(--muted);align-self:center">Enroll free to track progress.</span>`}</div>`;
}
function playLesson(i){if(!currentCourse)return;activeLesson=i;const enrolled=!!currentUser&&(currentUser.enrolledCourses||[]).some(x=>String(x)===String(currentCourse._id));$("#lessonPlayer").innerHTML=renderPlayer(currentCourse,i,enrolled);}
async function enrollCourse(id){
  if(!currentUser){closeModal();openAuth("login");toast("Create an account or log in to enroll.");return;}
  try{const d=await api(`/api/courses/${id}/enroll`,{method:"POST",body:"{}"});setLoggedIn(d.user);toast("Enrolled successfully — this course is free.");openCourse(id);}catch(e){toast(e.message);}
}
async function markComplete(courseId,lessonId){try{await api(`/api/progress/${courseId}/${lessonId}`,{method:"POST",body:"{}"});toast("Lesson marked complete!");}catch(e){toast(e.message);}}
function openExternal(url){try{const u=new URL(url);if(!["http:","https:"].includes(u.protocol))throw 0;window.open(u.href,"_blank","noopener,noreferrer");}catch{toast("This link is not valid.");}}
async function showDashboard(){
  if(!currentUser){openAuth("login");return;}
  let enrolled=[];
  try{const d=await api("/api/courses");courses=d.courses;enrolled=courses.filter(c=>(currentUser.enrolledCourses||[]).some(id=>String(id)===String(c._id)));}catch{}
  const isAdmin=currentUser.role==="admin";
  openModal(`<div class="eyebrow">YOUR LEARNING SPACE</div><h2 id="modalTitle">Hi, ${safe(currentUser.name)} 👋</h2><p>${safe(currentUser.email)}</p><div class="dashboard-tabs"><button class="active" onclick="showDashboard()">My learning</button>${isAdmin?'<button onclick="showAdmin()">Admin panel</button>':""}<button onclick="logout()">Log out</button></div>
  <div class="stats-strip" style="margin:18px 0;padding:15px"><div><b>${enrolled.length}</b><span>Enrolled courses</span></div><div><b>${(currentUser.completedLessons||[]).length}</b><span>Lessons completed</span></div></div>
  <h3 style="font:700 15px Manrope;margin-top:24px">My courses</h3><div class="admin-list">${enrolled.length?enrolled.map(c=>`<div class="admin-item"><div><b>${safe(c.title)}</b><small>${safe(c.category)} · ${c.lessons.length} lessons</small><div class="progress-track"><span style="width:${c.lessons.length?Math.min(100,((currentUser.completedLessons||[]).filter(k=>k.startsWith(c._id+":")).length/c.lessons.length)*100):0}%"></span></div></div><button class="mini-btn" onclick="openCourse('${c._id}')">Continue →</button></div>`).join(""):'<div class="empty-state">No enrolled courses yet. Explore the free courses to get started.</div>'}</div>
  <button class="btn btn-outline" style="margin-top:18px" onclick="closeModal();goCourses()">Explore courses →</button>`);
}
async function logout(){try{await api("/api/auth/logout",{method:"POST",body:"{}"});}catch{}localStorage.removeItem(tokenKey);setLoggedIn(null);closeModal();toast("You are logged out.");}
async function showAdmin(){
  if(!currentUser||currentUser.role!=="admin"){toast("Admin access required.");return;}
  try{
    const [stats,cd,ud]=await Promise.all([api("/api/admin/stats"),api("/api/courses"),api("/api/admin/users")]);
    courses=cd.courses;
    openModal(`<div class="eyebrow">ADMINISTRATION</div><h2 id="modalTitle">Admin panel</h2><p>Manage courses and review student accounts. Keep your admin login private.</p>
    <div class="stats-strip" style="margin:18px 0;padding:15px"><div><b>${stats.courses}</b><span>Courses</span></div><div><b>${stats.students}</b><span>Students</span></div></div>
    <div class="dashboard-tabs"><button class="active" onclick="showAdmin()">Courses</button><button onclick="showAdminUsers()">Students</button><button onclick="showDashboard()">My learning</button></div>
    <h3 style="font:700 15px Manrope">Add a course</h3><form class="form-stack" id="courseForm"><div class="admin-form">
    <label>Course title<input name="title" required maxlength="140" placeholder="e.g. HTML for Beginners"></label><label>Category<input name="category" required maxlength="60" placeholder="Web Development"></label>
    <label>Level<select name="level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Thumbnail URL<input name="thumbnail" type="url" placeholder="https://..."></label>
    <label class="full">Description<textarea name="description" rows="2" placeholder="What will students learn?"></textarea></label>
    <label class="full">Lessons (one per line: Title | Video URL | Notes URL | Duration)<textarea name="lessonsText" rows="4" placeholder="HTML basics | https://www.youtube.com/embed/UB1O30fR-EE | https://developer.mozilla.org/en-US/docs/Learn/HTML | 15 min"></textarea></label>
    <label class="full">Resources (one per line: Title | URL)<textarea name="resourcesText" rows="2" placeholder="MDN HTML | https://developer.mozilla.org/en-US/docs/Learn/HTML"></textarea></label>
    <label class="full" style="display:flex;align-items:center;gap:8px"><input name="featured" type="checkbox" style="width:auto"> Feature this course</label></div><button class="btn btn-primary" type="submit">Add course +</button></form>
    <h3 style="font:700 15px Manrope;margin-top:25px">Existing courses</h3><div class="admin-list">${courses.map(c=>`<div class="admin-item"><div><b>${safe(c.title)}</b><small>${safe(c.category)} · ${(c.lessons||[]).length} lessons</small></div><button class="mini-btn danger" onclick="deleteCourse('${c._id}')">Delete</button></div>`).join("")}</div>`,true);
    $("#courseForm").addEventListener("submit",async e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);const split=(str)=>str.split("\n").map(x=>x.trim()).filter(Boolean);
      const lessons=split(f.get("lessonsText")||"").map(line=>{const [title,videoUrl="",notesUrl="",duration="10 min"]=line.split("|").map(x=>x.trim());return {title,videoUrl,notesUrl,duration};});
      const resources=split(f.get("resourcesText")||"").map(line=>{const [title,url=""]=line.split("|").map(x=>x.trim());return {title,url};});
      const body={title:f.get("title"),category:f.get("category"),level:f.get("level"),thumbnail:f.get("thumbnail"),description:f.get("description"),featured:f.get("featured")==="on",lessons,resources};
      try{await api("/api/admin/courses",{method:"POST",body:JSON.stringify(body)});const d=await api("/api/courses");courses=d.courses;toast("Course added.");showAdmin();}catch(err){toast(err.message);}
    });
  }catch(e){toast(e.message);}
}
async function showAdminUsers(){
  try{const d=await api("/api/admin/users");openModal(`<div class="eyebrow">ADMINISTRATION</div><h2 id="modalTitle">Student accounts</h2><div class="dashboard-tabs"><button onclick="showAdmin()">← Courses</button></div><div class="admin-list">${d.users.length?d.users.map(u=>`<div class="admin-item"><div><b>${safe(u.name)}</b><small>${safe(u.email)} · Joined ${new Date(u.createdAt).toLocaleDateString()}</small></div><span class="free-label">${(u.enrolledCourses||[]).length} courses</span></div>`).join(""):'<p>No students registered yet.</p>'}</div>`,true);}catch(e){toast(e.message);}
}
async function deleteCourse(id){if(!confirm("Delete this course? This cannot be undone."))return;try{await api(`/api/admin/courses/${id}`,{method:"DELETE"});toast("Course deleted.");showAdmin();const d=await api("/api/courses");courses=d.courses;renderCourses();}catch(e){toast(e.message);}}
init();