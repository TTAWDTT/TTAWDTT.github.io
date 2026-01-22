# TTAWDTT.github.io

Static GitHub Pages site powered by a single HTML entry and markdown content. It uses hash-based routing, an album manifest, and a light/dark + atmosphere toggle.

## Structure

- `index.html`: App shell and routes.
- `assets/app.js`: Routing, markdown rendering, TOC, reading progress, albums, lightbox.
- `assets/styles.css`: Theme tokens, layout, and component styles.
- `docs/`: Articles, plus `docs/index.md` as the source of truth for the doc list.
- `content/`: About page markdown and related assets.
- `images/`: Album assets and `images/manifest.json`.
- `scripts/`: Helper scripts (optional; currently empty).

## Content workflow

1. Write a new post in `docs/*.md`.
2. Add it to `docs/index.md` (drives the home list, prev/next, and search).
3. Edit `content/aboutme.md` for the About page.
4. Update `images/manifest.json` for the album view.

## Markdown features

- Frontmatter (optional): `title`, `date`, `tags`, `series`, `order`, `summary`.
- Obsidian-style embeds: `![[image.jpg]]` and `[[doc|text]]`.
- Callouts: blockquote lines like `[!NOTE] Title`.

## Local preview

Open `index.html` directly in a browser, or serve the folder with any static server.

## Deployment

Push to GitHub Pages. No build step required.
