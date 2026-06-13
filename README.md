# TTAWDTT.github.io

Personal site built with Next.js 16, HeroUI v3, Tailwind CSS v4, and Bun.

## Development

```bash
bun install
bun run dev
```

## Blog Editing

Blog content lives in one folder:

```text
content/blog
```

Add or edit `.md` files there. The Blog page reads that folder at build time, lists the files in the left sidebar, and creates a page for each post.

Each post title comes from the first `# Heading` in the file. If a file has no heading, the file name is used.

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
