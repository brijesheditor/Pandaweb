# PandaLearn by Brijesh

A mobile-friendly free-learning platform starter built with HTML/CSS/JavaScript, Node.js/Express and MongoDB.

## Features included

- Responsive home page, course cards, search and category filters
- Student registration/login with bcrypt password hashing and JWT authentication
- MongoDB-backed courses, lessons, enrollments and lesson progress
- Learning modal with YouTube embed support and external notes/resources
- Admin dashboard to add/delete courses and view student accounts
- Health endpoint at `/api/health`
- Sample courses that link to public learning resources

## Important notes

- This is a starter platform, not a pixel-perfect copy of StudyPanda.
- Only add videos/PDFs that you own or are authorized to share. Public educational websites can change their access or terms.
- YouTube videos may disable embedding; use the original link in that case.
- This starter stores the JWT in browser localStorage for simplicity. For a production platform, consider secure HttpOnly cookies, rate limiting, email verification, password reset, logging, backups, and stronger admin protections.
- Do not commit `.env` or share your admin password.

## Run locally (if you have a computer)

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Fill in `MONGODB_URI`, `JWT_SECRET` (at least 24 characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Deploy from an Android phone with GitHub + Render

### A. MongoDB Atlas

1. Create a free MongoDB Atlas account and create a cluster.
2. Create a database user and save its username/password.
3. In Network Access, allow Render to connect. For a starter deployment, Atlas may require adding `0.0.0.0/0`; this permits connection attempts from any IP, so use a strong database password and restrict this later where practical.
4. Select Connect → Drivers and copy the Node.js connection string.
5. Replace the password and database name with your own. Use `pandalearn` as the database name.

### B. GitHub repository

1. Download and extract `PandaLearn.zip` on your phone.
2. Create a GitHub repository, e.g. `PandaLearn`.
3. Upload the contents of this folder (not the outer folder) to the repository. Ensure `server.js`, `package.json`, `public/`, `.gitignore`, and `README.md` are at the repository root.
4. Do NOT upload `.env`; `.env.example` is safe as a template.

### C. Render web service

1. Sign in at Render and create **New → Web Service**; connect your GitHub repository.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
3. Add environment variables:
   - `MONGODB_URI`: your Atlas connection string
   - `JWT_SECRET`: a long random string (at least 24 characters)
   - `ADMIN_EMAIL`: your admin email
   - `ADMIN_PASSWORD`: a strong, unique password (at least 12 characters recommended)
   - `NODE_ENV`: `production`
4. Deploy. Open `https://YOUR-SERVICE.onrender.com/api/health`. Expected response resembles `{"status":"ok","database":"connected"}`.
5. Open the service root URL to use the website. Render free-service availability/sleep behavior can change.

## Admin use

1. Visit the deployed website.
2. Log in using `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured in Render.
3. Tap your profile avatar → Admin panel.
4. Add a course. In the lessons field, put one lesson per line in this format:
   `Lesson title | https://www.youtube.com/embed/VIDEO_ID | https://public-notes-url | 15 min`
5. Resources format:
   `Resource title | https://public-resource-url`

If no thumbnail is provided, a card can show without an image. Use HTTPS links where possible.

## API overview

- `GET /api/health`
- `GET /api/courses?q=html&category=Web%20Development`
- `GET /api/courses/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/courses/:id/enroll` (Bearer token)
- `POST /api/progress/:courseId/:lessonId` (Bearer token)
- Admin endpoints: `/api/admin/stats`, `/api/admin/courses`, `/api/admin/users`

## Troubleshooting

- `database: disconnected`: check Atlas URI, password URL-encoding, database user, and Atlas Network Access.
- `JWT_SECRET` error: use a long secret string in Render environment variables.
- Admin login fails: check the exact `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Render. If an account already exists with that email, the app promotes it to admin on startup; its existing password remains unchanged. If needed, use a fresh admin email or securely reset that account.
- CSS not loading: ensure `public/style.css` exists and the HTML links to `/style.css`.
- Video doesn't play: the owner may block embedding; open the lesson's original link instead.
