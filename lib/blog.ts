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
    .filter((fileName) => fileName.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((fileName) => fileName.replace(/\.md$/i, ""));
}

export function getBlogPosts(): BlogPostMeta[] {
  return getBlogSlugs().map((slug) => {
    const markdown = stripFrontmatter(readPost(slug));

    return {
      slug,
      title: getPostTitle(markdown, slug),
      excerpt: getPostExcerpt(markdown),
    };
  });
}

export function getBlogPost(slug: string): BlogPost {
  const markdown = stripFrontmatter(readPost(slug));

  return {
    slug,
    title: getPostTitle(markdown, slug),
    excerpt: getPostExcerpt(markdown),
    html: markdownToHtml(stripTitleHeading(markdown)),
  };
}

function readPost(slug: string) {
  const safeSlug = slug.replace(/[\\/]/g, "");
  const filePath = path.join(blogDirectory, `${safeSlug}.md`);

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read blog post "${slug}": ${String(error)}`);
  }
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function stripTitleHeading(markdown: string) {
  return markdown.replace(/^#\s+.+\n?/, "").trimStart();
}

function getPostTitle(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();

  return heading || fallback.replace(/[-_]/g, " ");
}

function getPostExcerpt(markdown: string) {
  const plainText = markdown
    .replace(/^#\s+.+$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[[^\]]+]\([^)]+\)/g, "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^>\s?/, "")
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim(),
    )
    .find(Boolean);

  return plainText || "暂无摘要。";
}

function markdownToHtml(markdown: string) {
  const html: string[] = [];
  const paragraph: string[] = [];
  const list: string[] = [];
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    html.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
    paragraph.length = 0;
  };

  const flushList = () => {
    if (list.length === 0) {
      return;
    }

    html.push(
      `<ul>${list.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`,
    );
    list.length = 0;
  };

  const flushCode = () => {
    html.push(
      `<pre><code class="language-${escapeAttribute(codeLanguage)}">${escapeHtml(
        codeLines.join("\n"),
      )}</code></pre>`,
    );
    codeLanguage = "";
    codeLines = [];
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();

    if (codeLanguage) {
      if (line.startsWith("```")) {
        flushCode();
      } else {
        codeLines.push(rawLine);
      }

      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      codeLanguage = line.slice(3).trim() || "text";
      codeLines = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;

      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      continue;
    }

    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\d+\.\s+(.+)$/);

    if (unorderedItem || orderedItem) {
      flushParagraph();
      list.push((unorderedItem || orderedItem)?.[1] || "");
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);

    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${formatInline(quote[1])}</blockquote>`);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)]\(([^)]+)\)$/);

    if (image) {
      flushParagraph();
      flushList();
      html.push(
        `<p><img alt="${escapeAttribute(image[1])}" src="${escapeAttribute(
          image[2],
        )}" /></p>`,
      );
      continue;
    }

    paragraph.push(line.trim());
  }

  if (codeLanguage) {
    flushCode();
  }

  flushParagraph();
  flushList();

  return html.join("\n");
}

function formatInline(text: string) {
  const codeSpans: string[] = [];
  const encoded = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${code}</code>`);

    return `@@CODE${codeSpans.length - 1}@@`;
  });

  return encoded
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /@@CODE(\d+)@@/g,
      (_, codeIndex) => codeSpans[Number(codeIndex)] || "",
    );
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
  return escapeHtml(value).replace(/\s+/g, "%20");
}
