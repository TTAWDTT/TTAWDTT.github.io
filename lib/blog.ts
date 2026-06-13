import fs from "fs";
import path from "path";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
};

export type BlogPostMeta = Pick<BlogPost, "slug" | "title" | "excerpt">;

const blogDirectory = path.join(process.cwd(), "content", "blog");

export function getBlogSlugs() {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  return fs
    .readdirSync(blogDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getBlogPosts(): BlogPostMeta[] {
  return getBlogSlugs().map((slug) => {
    const markdown = readPost(slug);

    return {
      slug,
      title: getPostTitle(markdown, slug),
      excerpt: getPostExcerpt(markdown),
    };
  });
}

export function getBlogPost(slug: string): BlogPost {
  const markdown = readPost(slug);

  return {
    slug,
    title: getPostTitle(markdown, slug),
    excerpt: getPostExcerpt(markdown),
    html: markdownToHtml(markdown),
  };
}

function readPost(slug: string) {
  const safeSlug = slug.replace(/[\\/]/g, "");
  const filePath = path.join(blogDirectory, `${safeSlug}.md`);

  return fs.readFileSync(filePath, "utf8");
}

function getPostTitle(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();

  return heading || fallback.replace(/[-_]/g, " ");
}

function getPostExcerpt(markdown: string) {
  const plainText = markdown
    .replace(/^#\s+.+$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, "").trim())
    .find(Boolean);

  return plainText || "暂无摘要。";
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];

      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }

      html.push(
        `<pre><code class="language-${escapeAttribute(language)}">${escapeHtml(
          code.join("\n"),
        )}</code></pre>`,
      );
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      const level = heading[1].length;

      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }

      html.push(`<blockquote>${formatInline(quote.join(" "))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(
          `<li>${formatInline(lines[index].replace(/^[-*]\s+/, ""))}</li>`,
        );
        index += 1;
      }

      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(
          `<li>${formatInline(lines[index].replace(/^\d+\.\s+/, ""))}</li>`,
        );
        index += 1;
      }

      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    html.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
}

function formatInline(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/\s+/g, "-");
}
