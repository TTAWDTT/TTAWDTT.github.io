import fs from "fs";
import path from "path";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
};

export type BlogPostMeta = Pick<BlogPost, "slug" | "title" | "excerpt"> & {
  dateLabel: string;
  year: string;
};

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
  return getBlogSlugs()
    .map((slug) => {
      const markdown = stripFrontmatter(readPost(slug));
      const postDate = getPostDate(slug);

      return {
        slug,
        title: getPostTitle(markdown, slug),
        excerpt: getPostExcerpt(markdown),
        dateLabel: postDate.label,
        year: postDate.year,
      };
    })
    .sort((a, b) => {
      const byYear = Number(b.year) - Number(a.year);

      if (byYear !== 0) {
        return byYear;
      }

      return b.dateLabel.localeCompare(a.dateLabel, "zh-CN");
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

function getPostDate(slug: string) {
  const slugDate = slug.match(/^(\d{1,2})-(\d{1,2})$/);

  if (slugDate) {
    return {
      label: `${slugDate[1].padStart(2, "0")}-${slugDate[2].padStart(2, "0")}`,
      year: "2026",
    };
  }

  const filePath = path.join(blogDirectory, `${slug}.md`);
  const modifiedAt = fs.statSync(filePath).mtime;

  return {
    label: `${String(modifiedAt.getMonth() + 1).padStart(2, "0")}-${String(
      modifiedAt.getDate(),
    ).padStart(2, "0")}`,
    year: String(modifiedAt.getFullYear()),
  };
}

function unescapeMarkdownPunctuation(value: string) {
  return value.replace(/\\([\\`*{}\[\]()#+\-.!_~<>])/g, "$1");
}

function isSafeImageSrc(src: string) {
  return (
    /^(https?:\/\/|\/(?!\/)|\.{0,2}\/)/i.test(src) &&
    !/[\u0000-\u001f]/.test(src)
  );
}

function readHtmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern =
    /\s([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(source))) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function renderImage({
  alt = "",
  height,
  src,
  width,
}: {
  alt?: string;
  height?: string;
  src: string;
  width?: string;
}) {
  const trimmedSrc = src.trim();

  if (!isSafeImageSrc(trimmedSrc)) {
    return escapeHtml(src);
  }

  const sizeAttributes = [
    width && /^\d{1,5}$/.test(width) ? ` width="${width}"` : "",
    height && /^\d{1,5}$/.test(height) ? ` height="${height}"` : "",
  ].join("");

  return `<img src="${escapeHtml(trimmedSrc)}" alt="${escapeHtml(
    alt,
  )}"${sizeAttributes} loading="lazy" />`;
}

function renderHtmlImage(source: string) {
  if (!/^<img\b[^>]*\/?>$/i.test(source.trim())) {
    return null;
  }

  const attributes = readHtmlAttributes(source);

  if (!attributes.src) {
    return escapeHtml(source);
  }

  return renderImage({
    alt: attributes.alt,
    height: attributes.height,
    src: attributes.src,
    width: attributes.width,
  });
}

function renderMarkdownImage(source: string) {
  const match = source.match(/^!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);

  if (!match) {
    return null;
  }

  return renderImage({ alt: match[1], src: match[2] });
}

function markdownToHtml(markdown: string) {
  const html: string[] = [];
  const paragraph: string[] = [];
  const list: string[] = [];
  let listTag: "ol" | "ul" = "ul";
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
      `<${listTag}>${list
        .map((item) => `<li>${formatInline(item)}</li>`)
        .join("")}</${listTag}>`,
    );
    list.length = 0;
    listTag = "ul";
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

    const blockImage =
      renderHtmlImage(line.trim()) ?? renderMarkdownImage(line.trim());

    if (blockImage) {
      flushParagraph();
      flushList();
      html.push(blockImage);
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

    const horizontalRule = line.trim().match(/^(\*\s*){3,}$|^(-\s*){3,}$/);

    if (horizontalRule) {
      flushParagraph();
      flushList();
      html.push("<hr />");
      continue;
    }

    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\d+\.\s+(.+)$/);

    if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextTag = orderedItem ? "ol" : "ul";

      if (list.length > 0 && listTag !== nextTag) {
        flushList();
      }

      listTag = nextTag;
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
  const encoded = escapeHtml(unescapeMarkdownPunctuation(text)).replace(
    /`([^`]+)`/g,
    (_, code) => {
      codeSpans.push(`<code>${code}</code>`);

      return `@@CODE${codeSpans.length - 1}@@`;
    },
  );

  return encoded
    .replace(
      /!\[([^\]]*)]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
      (_, alt, src) => renderImage({ alt, src }),
    )
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>")
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
