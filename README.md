# VYRAQUON — One Reality. Infinite Identities.

A static, dependency-free infinite profile universe built with HTML5, CSS3, and vanilla JavaScript.

## Files

- `index.html` — page structure and app entry point
- `style.css` — responsive visual design
- `script.js` — deterministic profile engine, feed, search, routing, discovery, and virtualization

## Run locally

Open `index.html` in a modern browser. For the most representative behavior, serve the folder through a local static server (for example, VS Code Live Server or `python -m http.server`) because browser clipboard permissions vary by context.

## Deploy to GitHub Pages

1. Create a repository named `VYRAQUON` (or use another repository name).
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under the build/deployment source, select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
5. Wait for GitHub Pages to publish the site.

The project uses relative asset paths (`./style.css`, `./script.js`) and hash-based routes (`#/profile/123`), so it works from a repository subdirectory as well as a custom domain. If the repository is named `VYRAQUON`, the usual project URL is `https://YOUR-USERNAME.github.io/VYRAQUON/`.

## Deploy elsewhere

Upload the same four files to the static site root on Cloudflare Pages, Netlify, or a compatible static host. No server configuration, build step, backend, database, account, API key, or paid service is required.

## How the infinite feed works

- The feed starts with a batch of profiles and adds more when an `IntersectionObserver` sees the sentinel near the viewport.
- A scroll/resize distance check and a periodic recovery check provide fallbacks if observer callbacks do not fire or the viewport is short.
- The DOM keeps a rolling window of cards instead of retaining every rendered card. Profile identities are generated from IDs, so removing a card does not remove the identity from the universe.
- Batch work is limited per cycle to avoid freezing a mobile browser. Multiplication mode grows the requested batch multiplier mathematically, while each render cycle remains bounded for responsiveness.
- The universe is logically unbounded, not physically infinite: browser memory, CPU time, storage, and available runtime remain finite.

## Exact IDs and deterministic profiles

Profile IDs are handled as decimal strings, not JavaScript `Number` values. Validation accepts ASCII decimal digits, rejects zero-only values, and removes leading zeros for a canonical positive ID. Increment/decrement use string arithmetic, so long IDs are not rounded or displayed in scientific notation. The search route can directly generate a profile without generating earlier IDs, using `#/profile/<exact-id>`.

Profile details are created by deterministic string hashing and fixed word lists. The same canonical ID always produces the same profile name, category, description, signature, and attributes after reload. No real-person data or external avatar URLs are used.

## Controls

- Search: submit a positive decimal ID to open it directly.
- Open identity: navigate to a profile.
- Previous / next: navigate by exact string arithmetic.
- Discover another: open a generated random long ID.
- Related identity: derive a repeatable nearby-looking ID from the current ID.
- Copy profile link / ID: use the Clipboard API when available, with a browser fallback.
- ×2: toggle batch multiplication mode.

## Tests and limitations

Implemented in source, but **not all runtime tests have been executed in a real browser in this environment**. Do not treat the following as independently verified browser results:

- Continuous scrolling and observer recovery
- Mobile rendering on a physical Android device
- Clipboard behavior across browsers
- GitHub Pages deployment
- Long-session memory behavior

The code was reviewed for the main implementation paths, including decimal-string ID validation/arithmetic, direct hash routing, deterministic generation, event delegation, and bounded feed DOM. Please run the browser checklist below before production use.

### Suggested verification checklist

1. Open the page and confirm the first profile cards appear.
2. Scroll repeatedly and confirm new cards keep appearing.
3. Search for `999999999999999999999999` and verify the complete ID appears in the profile URL and detail.
4. Reload a profile URL and compare the identity details.
5. Use browser back/forward and previous/next controls.
6. Enable multiplication mode and continue scrolling.
7. Inspect the feed DOM after long scrolling; the number of card nodes should stay near the configured rolling window.
8. Test on a narrow mobile viewport.
9. Deploy in a repository subdirectory and confirm CSS, JS, and hash routes work.

## Configuration

Edit the `CONFIG` object near the top of `script.js`. `initialBatch`, `batchSize`, and `maxDomCards` tune responsiveness. `maxDomCards` limits only the rendered DOM window, not the profile universe or valid profile IDs.
