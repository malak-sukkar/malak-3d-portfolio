# CV upload setup

The portfolio remains a static site. Supabase provides the hosted sign-in and file storage used by the separate CV manager page.

## Connect Supabase

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy `anon` key).
3. In this project copy `.env.example` to `.env.local` and replace the example values with those two values. The publishable/anon key is intended for browser use; never put a `service_role` or secret key in this file.
4. In **Authentication → Providers → Email**, leave public sign-ups disabled. Create your own user from the Supabase dashboard.
5. In **Storage**, create a bucket named `cv`. Turn **Public bucket** on so portfolio visitors can view the CV. Set the file size limit to **15 MB** and allowed MIME types to `image/png`, `image/jpeg`, and `image/webp`.
6. Add these policies in **Storage → Policies** (or run them in the SQL editor). They let signed-in accounts upload and replace only the two CV page images. The read policy is needed because the uploader replaces the same files on each upload. If you already added the earlier PDF policies, remove those first by running:

```sql
drop policy if exists "CV managers can upload current CV" on storage.objects;
drop policy if exists "CV managers can replace current CV" on storage.objects;
```

Then add the current image policies:

```sql
create policy "CV managers can upload CV page images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cv' and name in ('page-1', 'page-2'));

create policy "CV managers can read CV page metadata"
on storage.objects
for select
to authenticated
using (bucket_id = 'cv' and name in ('page-1', 'page-2'));

create policy "CV managers can replace CV page images"
on storage.objects
for update
to authenticated
using (bucket_id = 'cv' and name in ('page-1', 'page-2'))
with check (bucket_id = 'cv' and name in ('page-1', 'page-2'));
```

Because this policy permits any authenticated account, keep public sign-ups disabled and create only the account(s) you trust to manage the CV.

7. Open **Authentication → URL Configuration**. Set **Site URL** to your portfolio's deployed address and add the admin page address (portfolio URL plus `/admin.html`) to **Redirect URLs**. For local testing, add the matching local admin address too and keep the local development server running when you open the invitation. Save the settings, then send yourself a fresh invite; an earlier invite still contains its old `localhost` redirect.

## Use the manager

Run the site locally or deploy it. Open `/malak-3d-portfolio/admin.html` on the deployed site (or `/admin.html` in local development), sign in, and choose both page images. PNG, JPG and WebP are supported, up to 15 MB per page. The images are saved as `page-1` and `page-2`; the portfolio fetches both when the CV is opened. If both uploaded images are not available, the existing CV page images remain as the fallback.

If Supabase says the email is already registered, don't invite it again. Open the manager, enter the email, choose **Forgot your password?**, then follow the reset link and set a password there.

For GitHub Pages, open the repository's **Settings → Secrets and variables → Actions**. Add a repository variable named `VITE_SUPABASE_URL` with the Project URL, and a repository secret named `VITE_SUPABASE_ANON_KEY` with the publishable (or legacy anon) key. The Pages workflow reads these values when it builds the site. After adding them, rerun **Deploy static content to Pages** from the Actions tab so the deployed manager receives the configuration. For other hosts, set the same two environment variables in the host's build settings. Never commit `.env.local` or place a service-role/secret key in a `VITE_` variable.
