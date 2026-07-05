# TTAWDTT.github.io

Personal site built with Next.js 16, HeroUI v3, Tailwind CSS v4, and Bun.

## Development

```bash
bun install
bun run dev
```

Open the local site at `http://127.0.0.1:3000` or `http://localhost:3000`.
Do not open `0.0.0.0`; it is a bind address, not a browser target.
The dev script pins port `3000` so it is not affected by a shell-level `PORT`
environment variable.

The default dev script uses webpack for a steadier Windows local preview. If you
want to test Turbopack explicitly, run:

```bash
bun run dev:turbo
```

## Blog Editing

Blog content lives in one folder:

```text
content/blog
```

Add or edit `.md` files there. The Blog page reads that folder at build time, lists the files in the left sidebar, and creates a page for each post.

Each post title comes from the first `# Heading` in the file. If a file has no heading, the file name is used.

Optional frontmatter can set the post mood and background. Put background images under `public`, then reference them with a leading `/`.

```md
---
category: 技术
mood: 清醒
context: thinking with clouds and climate
background: /blog-backgrounds/clouds.jpg
---

# Article title
```

If `background` is missing, the article falls back to the mood color. If both are missing, it uses the default site theme.

`category` can be `技术`, `日记`, or `随笔`. Category pages are generated at:

```text
/blog/category/tech
/blog/category/diary
/blog/category/essay
```

```bash
bun run build
```

## Deployment

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to `main`.

```bash
bun run build
```

## License

Licensed under the [MIT license](./LICENSE).
