# Publishing Peaksplit

Two steps: put the code on GitHub, then point Vercel at it. Takes a few minutes and needs no build configuration, since the app is static.

## 1. Push to GitHub

Create an empty repository at <https://github.com/new>. Name it `peaksplit`. Do not let GitHub add a README, licence or .gitignore — this folder already has them, and the extra files cause a merge conflict on the first push.

Then, from inside this folder:

```bash
git init
git add .
git commit -m "Peaksplit: CRISPR edit deconvolution from Sanger traces"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/peaksplit.git
git push -u origin main
```

If the push asks for a password, GitHub wants a personal access token rather than your account password. Create one under Settings → Developer settings → Personal access tokens → Tokens (classic), with the `repo` scope. Installing the [GitHub CLI](https://cli.github.com) avoids this: `gh auth login`, then `gh repo create peaksplit --public --source=. --push` replaces all of the above.

Keep the repository private if the trace files or guide sequences in it are unpublished. Vercel deploys private repositories on the free plan without any extra setup.

## 2. Deploy to Vercel

Go to <https://vercel.com/new> and import the repository. Vercel will detect a static site; leave the framework preset as **Other** and leave the build command and output directory empty. Click Deploy. The site appears at `peaksplit-YOUR-USERNAME.vercel.app` within about a minute.

Every later `git push` to `main` redeploys automatically. Pushes to other branches get their own preview URL, which is a convenient way to try a change on real traces before making it live.

For a custom domain, open the project's Settings → Domains and add it, then create the CNAME record Vercel shows you at your DNS provider.

### From the command line instead

```bash
npm i -g vercel
vercel          # first run links the project and gives a preview URL
vercel --prod   # promote to production
```

## Notes

Traces are read in the browser and never uploaded, so the deployment handles no sample data and needs no privacy configuration. There are no environment variables and no server-side code.

The app loads two fonts from Google Fonts. If your institution blocks external requests, or you want the page to work fully offline, delete the three `<link>` tags for `fonts.googleapis.com` and `fonts.gstatic.com` from `index.html`. The CSS already falls back to system fonts.

`npm run build` produces `dist/peaksplit.html`, a single self-contained file. That is the version to send to a collaborator who would rather not visit a URL, and it is worth attaching to a release so each published version has an archived copy.
