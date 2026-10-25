# Financial Recovery — private app foundation

A responsive Vite + Supabase authentication application. The source contains **no personal financial records**.

## Deploy using GitHub + Vercel

1. Upload the files in this folder to the **private** `financial-recovery-app` GitHub repository. Upload the *contents*, not the containing folder. Do not upload any `.env` file or personal financial tracker.
2. Import the repository in Vercel. Framework: **Vite**. Build command `npm run build`; output directory `dist`.
3. In Vercel project **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase **Project Settings → API** (public/publishable key only). **Never use `service_role` or `sb_secret` keys** in a browser app.
4. Deploy/redeploy and copy the HTTPS Vercel domain.
5. In Supabase **Authentication → URL Configuration**, set Site URL to that domain, and add `https://YOUR_DOMAIN/**` to allowed redirect URLs. For production, tighten redirects to required exact routes.
6. If the original invitation sent you to localhost, use the deployed app's password reset flow after URL configuration, or issue a new invite. The user must have a confirmed email and valid password to sign in.
7. Test login and sign-out, and verify only the signed-in user's rows are visible. **Do not import sensitive data until policies are tested using two distinct test users.**

## Security notes

- This is a *foundation*, not a security audit or completed financial recovery product.
- The supplied Supabase SQL in the chat enabled RLS on the initial two tables. Verify it remains enabled and test ownership restrictions for SELECT, INSERT, UPDATE and DELETE, including transactions referencing another user's account.
- Supabase publishable/anon key is safe to include in frontend code **only with correctly configured RLS**. Never commit passwords, secret keys, service-role keys, financial exports, or personal financial records.
- Public deployment URLs are accessible by anyone, but authenticated database records should remain protected by Supabase Auth + tested RLS.
- No automatic bank synchronization, AI coach, debt planning, service worker/offline support, or cross-device sync of local drafts is implemented yet. Cloud records in the two existing tables are fetched after sign-in.
- `manifest.webmanifest` is a starter. Add proper 192px and 512px icons and a service worker/offline plan before describing the app as a complete PWA.
