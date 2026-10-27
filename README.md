# Malak Sukkar — 3D Portfolio

An interactive 3D portfolio built around a virtual workspace. Explore the room to view my CV, artwork, education, projects, and social links.

**Live portfolio:** [malak-sukkar.github.io/malak-3d-portfolio](https://malak-sukkar.github.io/malak-3d-portfolio/)

## Features

- Interactive 3D room with clickable objects and camera views
- CV displayed as a PDF on the virtual monitor, with a download button
- Private CV manager at `/admin.html` for replacing the hosted PDF
- Artwork and education details
- Optional ambient audio controls
- Responsive layout for desktop and mobile

## Built with

- [Three.js](https://threejs.org/) for the 3D scene
- [Vite](https://vite.dev/) for local development and production builds
- [GSAP](https://gsap.com/) for camera and interface animations
- Supabase Authentication and Storage for the private CV manager
- GitHub Pages for hosting and GitHub Actions for deployment

## Run locally

You need Node.js and npm installed.

```sh
npm install
```

Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable (or legacy anon) key:

```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Start the local development server:

```sh
npm run dev
```

Vite prints the local address in the terminal. Open that address to explore the portfolio. The CV manager is available at `/admin.html`.

Other useful commands:

```sh
npm run build
npm run preview
```

## CV manager setup

The CV manager uploads a single PDF to a public Supabase Storage bucket named `cv`, using the object name `cv.pdf`. Configure the bucket to accept PDF files up to 15 MB, and add Storage policies that allow authenticated CV managers to upload and replace only `cv.pdf`. Keep public account sign-ups disabled and create manager accounts from the Supabase dashboard.

The PDF in [`public/cv/cv.pdf`](public/cv/cv.pdf) is the static fallback used until a hosted CV PDF is available. Uploading a replacement through the manager updates the hosted PDF.

For GitHub Pages builds, add these repository settings under **Settings → Secrets and variables → Actions**:

- Repository variable `VITE_SUPABASE_URL`: your Supabase project URL
- Repository secret `VITE_SUPABASE_ANON_KEY`: your publishable (or legacy anon) key

Never commit `.env.local` or use a Supabase service-role/secret key in the frontend.

## Deploy

The GitHub Actions workflow builds and deploys the site to GitHub Pages whenever a commit is pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
