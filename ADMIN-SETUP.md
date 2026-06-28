# Max's Tin Can — Admin Portal Setup

The site now has a password-protected manager at **/admin** (linked from the
small "Admin" text in the footer). It lets you edit any text, swap any photo,
and add/remove calendar events — and the changes go live for everyone.

For it to work, two things must be set up **once** in Vercel.

## 1. Add a Blob store (where edits + photos are saved)

1. Go to the project in the Vercel dashboard → **Storage** tab.
2. Click **Create** → **Blob** → give it any name → **Create**.
3. Connect it to the `maxs-tin-can` project when prompted.

This automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable — you
don't need to copy anything.

## 2. Set the admin password

1. Project → **Settings** → **Environment Variables**.
2. Add a new variable:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** whatever password you want (use something strong).
   - Apply to **Production** (and Preview if you like).
3. Save.

## 3. Redeploy

Trigger a new deployment (push to git, or **Deployments → Redeploy**) so the new
files and settings take effect.

## Using it

- Visit `yoursite.com/admin`, enter the password.
- **Events** tab — add/edit/remove what shows on the calendar (the most-used part).
- **Text** tab — change any wording on the site.
- **Photos** tab — upload a new image to replace any photo (auto-resized).
- Hit **Save changes**. Refresh the main site to see them live.

## Notes

- The password is checked on the server for every save/upload.
- Photos are resized in the browser before upload to keep the site fast.
- If you ever change a text box back to exactly the original wording, that field
  goes back to the site default automatically.
- Run `npm install` locally before `vercel dev` if testing on your machine.
