# V3 deployment

Public application: https://olegmikhc.github.io/development-modeler-v3/

Manually run (workflow_dispatch) `.github/workflows/pages.yml`. GitHub Pages uses GitHub Actions and serves the static `out/` build with base path `/development-modeler-v3`.

Cloud configuration uses repository Actions variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only, never a service-role key). Apply `supabase/migrations/001` through `005` in order to the new Supabase project. Set Supabase Auth Site URL to the application URL and allow its `/login/` redirect. Cloud access is controlled by authenticated ownership/membership and row-level security; a sharing token grants temporary read-only access to one model.

Without these variables, local models and JSON exchange work; cloud sharing is unavailable. Browser-local data does not move between origins: export from the previous application and import into this one.

The original development-modeler repository and database are independent and must not be overwritten.

Email access roles are configured per model. Verified recipients can view/copy as readers, or edit the original and manage invitations as editors. Invitations do not send email automatically. Google sign-in is implemented in the application. The Google provider must be enabled in Supabase with a Web OAuth client whose authorized redirect URI is `https://mecndnvvcwqcnnstmvzr.supabase.co/auth/v1/callback`. Provider credentials must only be stored in Supabase, never in the browser bundle. Google OAuth provider setup is pending. Custom SMTP is not configured, so external email/password registrations cannot receive verification mail yet.

V3 uses its own Supabase project `mecndnvvcwqcnnstmvzr` (Singapore). Migrations 001–005 are installed. Do not point V3 at an older database.
