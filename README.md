# Mayur Pol — .NET Developer Portfolio

A fast, fully static portfolio website for **Mayur Pol, .NET Developer** (ASP.NET Core · C# · Web API · SQL Server).

- **100% static:** HTML5, CSS3 and vanilla JavaScript (ES modules). No framework, no backend, no database, no build step.
- **Data-driven:** all content lives in [`data/portfolio.json`](data/portfolio.json).
- **Edit Mode:** add, edit, reorder, hide and delete content in the browser, then export the JSON to publish.
- **Netlify-ready:** `netlify.toml`, `_redirects`, Netlify Forms contact form, 404 page, sitemap and robots.txt.

---

## Contents

1. [Features](#features)
2. [Project structure](#project-structure)
3. [Run locally](#run-locally)
4. [Update your content](#update-your-content)
5. [Edit Mode](#edit-mode)
6. [Adding projects and experience (JSON)](#adding-projects-and-experience-json)
7. [Images, certificates and resume](#images-certificates-and-resume)
8. [Deploy to Netlify](#deploy-to-netlify)
9. [Contact form (Netlify Forms)](#contact-form-netlify-forms)
10. [Before you go live — checklist](#before-you-go-live--checklist)
11. [SEO, performance and accessibility](#seo-performance-and-accessibility)
12. [Testing checklist](#testing-checklist)

---

## Features

| Area | What you get |
| --- | --- |
| Hero | Name, designation, headline, intro, auto-calculated years of experience, core stack, photo, Download Resume / View Projects / Contact Me, LinkedIn, GitHub, email |
| About | Professional summary, quick facts card, areas of expertise, career interests |
| Experience | Vertical timeline; supports any number of companies and roles; dates, duration, employment type, project, responsibilities, key contributions, technologies |
| Projects | Cards with category filters (All, Professional, Personal, Practice, Open Source), featured and draft status, detail modal with overview, problem, solution, responsibilities, features, screenshots, GitHub and live links, previous/next navigation |
| Skills | 8 categories with icons; highlighted chips mark the primary stack (no misleading percentages) |
| Education, Certifications, Achievements | Multiple records each; certificates can show an image or PDF and a verification link |
| Contact | Email, phone, LinkedIn, GitHub, location, resume download, and a validated Netlify Forms contact form |
| Theme | Premium dark theme by default, optional light theme (remembered per browser) |
| Edit Mode | Browser-local CMS with JSON export / import / restore |

Empty sections (for example Certifications, until you add one) are hidden from visitors automatically.

## Project structure

```
mayur-portfolio/
├── index.html              # Single page; the contact form is static markup for Netlify Forms
├── 404.html                # Custom "page not found"
├── netlify.toml            # Publish settings + security & cache headers
├── _redirects              # Short links (/resume, /cv, /linkedin, /projects …)
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── README.md
├── data/
│   └── portfolio.json      # ← ALL portfolio content (source of truth for visitors)
├── css/
│   ├── style.css           # Design tokens, layout and components
│   ├── animations.css      # Reveal / modal / toast animations (respects reduced motion)
│   ├── admin.css           # Edit Mode toolbar and forms
│   └── responsive.css      # Breakpoints (1080 / 960 / 720 / 480 px) and print styles
├── js/
│   ├── theme-init.js       # Applies saved theme before first paint (classic script)
│   ├── main.js             # Entry point: load data, render sections, ordering & visibility
│   ├── data.js             # Data store: load JSON, merge localStorage edits, CRUD helpers
│   ├── storage.js          # localStorage wrapper (quota-safe)
│   ├── utils.js            # Escaping, dates, URLs, image compression, downloads
│   ├── icons.js            # Inline SVG icon set
│   ├── ui.js               # Shared render helpers (chips, lists, edit controls)
│   ├── modal.js            # <dialog> helpers, toasts, confirm, lightbox
│   ├── theme.js            # Dark/light toggle
│   ├── navigation.js       # Sticky header, mobile menu, active link, back-to-top
│   ├── profile.js          # Hero + About
│   ├── experience.js       # Timeline
│   ├── projects.js         # Filters, cards, detail modal
│   ├── skills.js
│   ├── education.js
│   ├── certifications.js
│   ├── achievements.js
│   ├── contact.js          # Contact details + Netlify Forms submission
│   └── admin.js            # Edit Mode
└── assets/
    ├── images/             # profile.svg (placeholder), og-image.png, projects/
    ├── icons/              # favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192/512.png
    ├── certificates/       # Put certificate images / PDFs here
    └── resume/
        └── Mayur-Pol-Resume.pdf
```

## Run locally

The site loads `data/portfolio.json` with `fetch` and uses ES modules, so it must be served over HTTP. **Opening `index.html` by double-clicking will not work** (browsers block modules and JSON on `file://`; the page tells you this).

From the project folder, run any static server:

```bash
python -m http.server 8080
```

or

```bash
npx serve .
```

Then open <http://localhost:8080>. The contact form only delivers messages on Netlify; locally it shows its error message, which is expected.

## Update your content

There are two ways — use whichever you prefer:

1. **Edit `data/portfolio.json` directly** in your editor, commit, and redeploy. This is the permanent, public way.
2. **Use Edit Mode in the browser** (below), then **Export** and replace `data/portfolio.json` with the exported file, then redeploy.

Text fields support these tokens, which are calculated automatically:

| Token | Value |
| --- | --- |
| `{years}` | Years of experience, rounded down to the half year (from `profile.careerStart`, or your earliest visible experience). E.g. May 2024 → Nov 2026 = `2.5+` |
| `{companies}` | Number of distinct companies in visible experience |
| `{projects}` | Number of published projects |

## Edit Mode

**Turn it on:** open the site with `?edit` at the end of the URL (e.g. `https://portfoliomayur45.netlify.app/?edit` or `http://localhost:8080/?edit`), or press **Alt + Shift + E**. It stays on in that browser until you click **Exit**.

When it's on, a toolbar appears at the bottom and every card gets controls:

| Control | What it does |
| --- | --- |
| ✏️ Edit | Opens a form for that item |
| ⬆️ / ⬇️ | Reorder items (respects the active project filter) |
| 👁 | Hide from visitors / show again (projects switch between Published and Draft) |
| 🗑 | Delete (with confirmation) |
| × on a skill / “Add a skill…” | Remove or add individual skills inline |
| **Add** | New project, experience, skill category, education, certification or achievement |
| **Profile** | Name, title, headline, intro, photo, contact links, stats, About text |
| **Sections** | Reorder sections, rename menu labels / headings / subtitles, hide sections |
| **Resume** | Upload a replacement PDF (or point to a path) and set the download file name |
| **Export** | Downloads `portfolio.json` with everything currently shown |
| **Import** | Loads a previously exported `portfolio.json` (validated before applying) |
| **Restore** | Discards all local changes and shows the published data again |

> ### ⚠️ Important: Edit Mode data is local to one browser
>
> - Changes are saved in **localStorage of the current browser on the current device only**.
> - They are **not** visible to visitors, **not** synced across browsers or devices, and are lost if you clear site data.
> - Edit Mode is **not an admin login and is not security**. The site is static, so anyone can switch Edit Mode on — but it only ever changes *their own* browser's copy. Nothing they do can affect your published site.
> - **To make changes permanent and public:** Export → replace `data/portfolio.json` → commit/redeploy to Netlify → click Restore in your browser to drop the local copy.
> - If the deployed JSON changes after you made local edits, the toolbar warns you so you don't keep looking at stale data.

## Adding projects and experience (JSON)

Add objects to the arrays in `data/portfolio.json`. Every item needs a unique `id`. Fields you leave empty are simply not shown.

### New project

```json
{
  "id": "proj-inventory-api",
  "name": "Inventory Management API",
  "category": "personal",
  "organization": "Personal project",
  "duration": "Jan 2026 – Feb 2026",
  "summary": "One or two sentences shown on the card.",
  "overview": "A longer introduction shown in the detail modal.",
  "problem": "What problem does it solve?",
  "solution": "How you solved it.",
  "responsibilities": ["What you did", "Another thing you did"],
  "features": ["Feature one", "Feature two"],
  "technologies": ["C#", "ASP.NET Core Web API", "EF Core", "SQL Server"],
  "images": [
    { "src": "assets/images/projects/inventory-1.webp", "alt": "Dashboard screen" }
  ],
  "githubUrl": "https://github.com/your-username/inventory-api",
  "liveUrl": "",
  "featured": false,
  "confidential": false,
  "status": "published"
}
```

- `category`: `professional`, `personal`, `practice` or `opensource`.
- `status`: `published` or `draft` (drafts are hidden from visitors).
- `confidential: true` shows a “Private codebase” note — use it for client work, and never link private source code.

### New work experience

```json
{
  "id": "exp-new-company",
  "company": "Company Name",
  "designation": ".NET Developer",
  "employmentType": "Full-time",
  "location": "Pune, India",
  "start": "2027-01",
  "end": "",
  "current": true,
  "project": "Project or product name",
  "summary": "",
  "responsibilities": ["…"],
  "contributions": ["…"],
  "technologies": ["C#", "ASP.NET Core"],
  "visible": true
}
```

Dates use `YYYY-MM`. For a past role set `"current": false` and an `end` month. When you add a new current role, remember to set `current: false` and an `end` month on the previous one. Items render in array order — put the most recent first.

### Other collections

- **skills:** `{ "id", "category", "icon", "description", "items": [{ "name": "C#", "core": true }] }` — `core: true` highlights a skill as primary stack. Icons: `code, server, layout, database, cloud, shield, flask, wrench, terminal, cpu, layers, sparkles, zap, globe, award, trophy, star, rocket, target, briefcase, git-branch`.
- **education:** `{ "id", "degree", "specialization", "college", "university", "startYear", "endYear", "score", "description", "visible" }`
- **certifications:** `{ "id", "name", "issuer", "date": "YYYY-MM", "credentialId", "file": "assets/certificates/x.pdf", "fileType", "verifyUrl", "visible" }`
- **achievements:** `{ "id", "title", "description", "context", "icon", "visible" }`
- **sections:** order, `label` (menu), `title` (heading), `subtitle` and `visible` for each section.

## Images, certificates and resume

- **Profile photo:** replace `assets/images/profile.svg` (an initials placeholder) with your photo, e.g. `assets/images/profile.webp` (portrait, ~800×930 px, under 150 KB), and update `profile.photo` in the JSON.
- **Project screenshots:** put them in `assets/images/projects/` (WebP or JPG, ~1600 px wide) and reference them in the project's `images` array. The first image is the card cover.
- **Certificates:** put images or PDFs in `assets/certificates/` and set the certification's `file`.
- **Resume:** replace `assets/resume/Mayur-Pol-Resume.pdf` with the new PDF (same name), then redeploy.
- **Social preview:** `assets/images/og-image.png` (1200×630) is used by LinkedIn, WhatsApp, Slack, etc.

Uploading in Edit Mode also works: images are resized in the browser and PDFs up to 1.5 MB are embedded in the data. That's convenient, but it makes `portfolio.json` larger and localStorage holds only about 5 MB, so for the live site prefer real files in `assets/`.

## Deploy to Netlify

No build command. Publish directory: the project root (`.`). Both are already set in `netlify.toml`.

### Option 1 — Drag and drop

1. Sign in at <https://app.netlify.com>.
2. Go to **Sites** and drag the whole `mayur-portfolio` folder onto the deploy area (or use <https://app.netlify.com/drop>).
3. Netlify uploads and publishes it in seconds and gives you an HTTPS URL like `https://random-name.netlify.app`.
4. Optionally rename the site under **Site configuration → Change site name**. If you rename it or add a custom domain, update the site URL as described in the checklist below.
5. To update later, open the site's **Deploys** tab and drag the folder in again.

### Option 2 — GitHub with automatic deploys (recommended)

1. Create a GitHub repository and push this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/mayur-portfolio.git
   git push -u origin main
   ```

2. In Netlify, choose **Add new site → Import an existing project → GitHub** and pick the repository.
3. Leave **Build command** empty and set **Publish directory** to `.` (Netlify reads both from `netlify.toml`).
4. Click **Deploy**. Every push to `main` now redeploys automatically.

HTTPS is enabled automatically on `*.netlify.app` and on custom domains (Let's Encrypt). For a custom domain, use **Domain management → Add a domain**.

## Contact form (Netlify Forms)

The form in `index.html` has `name="contact"`, `data-netlify="true"`, a hidden `form-name` field and a honeypot (`bot-field`). JavaScript validates the fields, then posts them to `/` as URL-encoded data and shows a success or error message — there's no backend code.

1. In Netlify, open **Site configuration → Forms** and click **Enable form detection** (needed once on new sites).
2. **Redeploy** the site so Netlify scans the HTML and registers the `contact` form.
3. Submit a test message on the live site. It appears under **Forms → contact**.
4. Optional: **Forms → Form notifications → Add notification → Email notification** to receive submissions by email.

The free plan includes 100 submissions per month. Netlify's spam filtering plus the honeypot keep out most spam.

## Before you go live — checklist

- [x] **Site URL** is set to `https://portfoliomayur45.netlify.app/` (the GitHub-connected Netlify project; every push to `main` redeploys it). If the address ever changes (site rename or custom domain), update it in `index.html` (canonical, Open Graph, Twitter and JSON-LD tags), `sitemap.xml` and `robots.txt`.
- [ ] **Add your GitHub profile** URL (`profile.github`). GitHub links are hidden until it's set.
- [ ] **Add your photo** (see above).
- [ ] **Employment type** (Full-time, etc.) isn't in the resume, so it's blank for each role. Fill it in if you want it shown.
- [ ] Review the project descriptions and make sure nothing confidential about clients is shown.
- [ ] Enable Netlify form detection and send a test message.

## SEO, performance and accessibility

- Semantic landmarks (`header`, `nav`, `main`, `section`, `footer`), one `h1`, labelled sections, skip link.
- Title, meta description, canonical URL, Open Graph and Twitter cards, `Person` JSON-LD, sitemap, robots.txt, favicons and web manifest.
- No frameworks, no icon fonts (inline SVG), lazy-loaded images, small CSS/JS, fonts loaded with `display=swap`.
- Accessible forms (labels, `aria-invalid`, error messages, live status region), keyboard-friendly dialogs (native `<dialog>`), visible focus styles, `prefers-reduced-motion` support, WCAG-friendly contrast in both themes.
- Security headers (CSP, X-Frame-Options, etc.) in `netlify.toml`. All content is HTML-escaped before rendering, and only safe URL schemes are allowed.

## Testing checklist

- [ ] Navigation links scroll to each section; the active link updates while scrolling.
- [ ] Mobile menu opens and closes (button, link click, Escape, outside click).
- [ ] Theme toggle switches dark and light and is remembered after reload.
- [ ] Project filters work and the counts are right; cards open the detail modal; Prev/Next and Escape work.
- [ ] Resume downloads from the header, hero, About card and Contact section.
- [ ] The contact form shows validation errors, then success on Netlify (or the error message locally).
- [ ] With `?edit`: add, edit, reorder, hide and delete items in each section; reload and confirm the changes persist.
- [ ] Export, Restore, then Import the exported file: the edits come back.
- [ ] No console errors; no broken images or links.
