# CV upload setup

The portfolio remains a static site. Supabase provides sign-in and file storage for the separate CV manager page. The manager uploads one PDF, and the portfolio displays that PDF in the computer monitor.

## Connect Supabase

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy `anon` key).
3. In this project copy `.env.example` to `.env.local` and replace the example values with those two values. The publishable/anon key is intended for browser use; never put a `service_role` or secret key in this file.
4. In **Authentication → Providers → Email**, leave public sign-ups disabled. Create your own user from the Supabase dashboard.
5. In **Storage**, create a bucket named `cv`. Turn **Public bucket** on so portfolio visitors can view the CV. Set the file size limit to **15 MB** and the allowed MIME type to `application/pdf`.
6. If the bucket already exists, edit its allowed MIME types to `application/pdf`. Then replace the old image-upload policies in **Storage → Policies** by running this SQL in the SQL editor:

```sql
drop policy if exists "CV managers can upload CV page images" on storage.objects;
drop policy if exists "CV managers can read CV page metadata" on storage.objects;
drop policy if exists "CV managers can replace CV page images" on storage.objects;
drop policy if exists "CV managers can upload current CV" on storage.objects;
drop policy if exists "CV managers can replace current CV" on storage.objects;
drop policy if exists "CV managers can upload current PDF" on storage.objects;
drop policy if exists "CV managers can read current PDF metadata" on storage.objects;
drop policy if exists "CV managers can replace current PDF" on storage.objects;

create policy "CV managers can upload current PDF"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cv' and name = 'cv.pdf');

create policy "CV managers can read current PDF metadata"
on storage.objects
for select
to authenticated
using (bucket_id = 'cv' and name = 'cv.pdf');

create policy "CV managers can replace current PDF"
on storage.objects
for update
to authenticated
using (bucket_id = 'cv' and name = 'cv.pdf')
with check (bucket_id = 'cv' and name = 'cv.pdf');
```

These policies permit any authenticated account to manage the CV, so keep public sign-ups disabled and create only accounts you trust.

7. Open **Authentication → URL Configuration**. Set **Site URL** to your portfolio's deployed address and add the admin page address (portfolio URL plus `/admin.html`) to **Redirect URLs**. For local testing, add the matching local admin address too and keep the local development server running when you open the invitation. Save the settings, then send yourself a fresh invite; an earlier invite still contains its old `localhost` redirect.

## Use the manager

Run the site locally or deploy it. Open `/malak-3d-portfolio/admin.html` on the deployed site (or `/admin.html` in local development), sign in, and choose one PDF file up to 15 MB. It is uploaded as `cv.pdf`; the portfolio fetches and displays it when the CV is opened. The two existing page images have been combined into the local PDF fallback, which remains available if the hosted PDF has not been uploaded yet.

If Supabase says the email is already registered, don't invite it again. Open the manager, enter the email, choose **Forgot your password?**, then follow the reset link and set a password there.

For GitHub Pages, open the repository's **Settings → Secrets and variables → Actions**. Add a repository variable named `VITE_SUPABASE_URL` with the Project URL, and a repository secret named `VITE_SUPABASE_ANON_KEY` with the publishable (or legacy anon) key. The Pages workflow reads these values when it builds the site. After adding them, rerun **Deploy static content to Pages** from the Actions tab so the deployed manager receives the configuration. For other hosts, set the same two environment variables in the host's build settings. Never commit `.env.local` or place a service-role/secret key in a `VITE_` variable.
