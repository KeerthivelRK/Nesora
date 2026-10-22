# NESORA DIGITAL — full-stack website
Frontend: HTML/CSS/vanilla JS (public/). Backend: Node + Express with JSON-file storage (data/).

## Run
    npm install
    ADMIN_TOKEN=your-secret npm start      # http://localhost:3000

## Customize
- Edit data/profile.json and data/projects.json (no code changes needed).
- Read contact messages: curl -H "x-admin-token: your-secret" http://localhost:3000/api/messages

## API
GET /api/profile · GET /api/projects?tag=&q= · GET /api/projects/:id · POST /api/contact · GET /api/messages (admin)
