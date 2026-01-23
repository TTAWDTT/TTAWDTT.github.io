import fs from "node:fs";
import path from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://ttawdtt.github.io/").replace(/\/+$/, "") + "/";
const DOCS_INDEX = "docs/index.md";
const OUT_FILE = "feed.xml";
const MAX_ITEMS = Number(process.env.RSS_MAX_ITEMS || 30);
const MODE = (process.env.RSS_MODE || "summary").toLowerCase(); // summary | full

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*?\]\([^)]+\)/g, "")
    .replace(/\[[^\]]*?\]\([^)]+\)/g, "")
    .replace(/#+\s/g, "")
    .replace(/>\s/g, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatter(markdown) {
  const match = String(markdown).match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }
  const raw = match[1];
  const body = markdown.slice(match[0].length);
  const frontmatter = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    frontmatter[key] = value.replace(/^['"]|['"]$/g, "");
  }
  return { frontmatter, body };
}

function splitTitle(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
    break;
  }
  return "";
}

function parseDocIndexLinks(markdown) {
  const links = [];
  const regex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let match = regex.exec(markdown);
  while (match) {
    links.push({ text: match[1].trim(), href: match[2].trim() });
    match = regex.exec(markdown);
  }
  return links;
}

function normalizeDocPath(href) {
  const clean = href.replace(/^\.\//, "");
  if (clean.startsWith("docs/")) return clean;
  return path.posix.join("docs", clean);
}

function slugFromDocPath(docPath) {
  const base = path.posix.basename(docPath).replace(/\.md$/i, "");
  return encodeURIComponent(base);
}

function toRssDate(date) {
  return new Date(date).toUTCString();
}

function getDocMeta(docPath, fallbackTitle) {
  const raw = fs.readFileSync(docPath, { encoding: "utf8" });
  const { frontmatter, body } = parseFrontmatter(raw);
  const title = frontmatter.title || splitTitle(body) || fallbackTitle || path.basename(docPath, ".md");
  const dateRaw = frontmatter.date || frontmatter.time || frontmatter.updated || "";
  const date = dateRaw ? new Date(dateRaw) : fs.statSync(docPath).mtime;
  const plain = stripMarkdown(body);
  const summary = frontmatter.summary || frontmatter.description || plain.slice(0, 180);
  return { title, date, plain, summary };
}

function buildRss({ siteUrl, items }) {
  const now = new Date();
  const channelTitle = "TTAWDTT";
  const channelLink = siteUrl;
  const channelDesc = "TTAWDTT 的文章更新";

  const itemXml = items
    .map((item) => {
      const description = MODE === "full" ? escapeXml(item.description) : escapeXml(item.description);
      return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(toRssDate(item.date))}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <lastBuildDate>${escapeXml(toRssDate(now))}</lastBuildDate>
    <language>zh-CN</language>${itemXml}
  </channel>
</rss>
`;
}

function main() {
  if (!fs.existsSync(DOCS_INDEX)) {
    console.error(`Missing ${DOCS_INDEX}`);
    process.exit(1);
  }
  const indexRaw = fs.readFileSync(DOCS_INDEX, { encoding: "utf8" });
  const links = parseDocIndexLinks(indexRaw);
  const docs = links
    .map((l) => ({ titleFromIndex: l.text, path: normalizeDocPath(l.href) }))
    .filter((d) => d.path && fs.existsSync(d.path));

  const items = docs
    .map((d) => {
      const meta = getDocMeta(d.path, d.titleFromIndex);
      const slug = slugFromDocPath(d.path);
      const link = `${SITE_URL}#/docs/${slug}`;
      const guid = link;
      const description = MODE === "full" ? meta.plain : meta.summary;
      return { ...meta, link, guid, description };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, Math.max(1, MAX_ITEMS));

  const rss = buildRss({ siteUrl: SITE_URL, items });
  fs.writeFileSync(OUT_FILE, rss, { encoding: "utf8" });
  console.log(`Wrote ${OUT_FILE} (${items.length} items) using SITE_URL=${SITE_URL}`);
}

main();
