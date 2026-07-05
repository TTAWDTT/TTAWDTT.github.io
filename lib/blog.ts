import fs from "fs";
import path from "path";

import { blogCategories, type BlogCategory } from "@/lib/blog-categories";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  toc: BlogHeading[];
  category: BlogCategory;
  dateLabel: string;
  distanceLabel: string;
  backgroundImage: string | null;
  mood?: string;
  context?: string;
  tags: string[];
  year: string;
};

export type BlogHeading = {
  id: string;
  level: number;
  text: string;
};

export type BlogPostMeta = Pick<BlogPost, "slug" | "title" | "excerpt"> & {
  category: BlogCategory;
  dateLabel: string;
  distanceLabel: string;
  mood?: string;
  context?: string;
  tags: string[];
  year: string;
};

type Frontmatter = Record<string, string>;

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
      const { attributes, body } = parseFrontmatter(readPost(slug));
      const postDate = getPostDate(slug, attributes.date);
      const tags = parseTags(attributes.tags);

      return {
        slug,
        title: getPostTitle(body, slug),
        excerpt: getPostExcerpt(body),
        category: getPostCategory(attributes.category, tags),
        dateLabel: postDate.label,
        distanceLabel: postDate.distanceLabel,
        mood: attributes.mood,
        context: attributes.context,
        tags,
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
  const { attributes, body } = parseFrontmatter(readPost(slug));
  const postDate = getPostDate(slug, attributes.date);
  const rendered = markdownToHtml(stripTitleHeading(body));
  const tags = parseTags(attributes.tags);

  return {
    slug,
    title: getPostTitle(body, slug),
    excerpt: getPostExcerpt(body),
    html: rendered.html,
    toc: rendered.toc,
    category: getPostCategory(attributes.category, tags),
    dateLabel: postDate.fullLabel,
    distanceLabel: postDate.distanceLabel,
    backgroundImage: getPostBackgroundImage(attributes.background),
    mood: attributes.mood,
    context: attributes.context,
    tags,
    year: postDate.year,
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

function parseFrontmatter(markdown: string): {
  attributes: Frontmatter;
  body: string;
} {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);

  if (!match) {
    return { attributes: {}, body: markdown };
  }

  const attributes = match[1]
    .split(/\r?\n/)
    .reduce<Frontmatter>((frontmatter, line) => {
      const item = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);

      if (!item) {
        return frontmatter;
      }

      frontmatter[item[1]] = item[2].replace(/^["']|["']$/g, "").trim();

      return frontmatter;
    }, {});

  return { attributes, body: markdown.slice(match[0].length) };
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

function getPostDate(slug: string, explicitDate?: string) {
  const parsedDate = explicitDate ? new Date(`${explicitDate}T00:00:00`) : null;

  if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
    return formatPostDate(parsedDate);
  }

  const slugDate = slug.match(/^(\d{1,2})-(\d{1,2})$/);

  if (slugDate) {
    return formatPostDate(
      new Date(2026, Number(slugDate[1]) - 1, Number(slugDate[2])),
    );
  }

  const filePath = path.join(blogDirectory, `${slug}.md`);
  const modifiedAt = fs.statSync(filePath).mtime;

  return formatPostDate(modifiedAt);
}

function formatPostDate(date: Date) {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const distance = Math.max(
    0,
    Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000),
  );
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return {
    distanceLabel: distance === 0 ? "今日" : `距今 ${distance} 日`,
    fullLabel: `${date.getFullYear()}.${month}.${day}`,
    label: `${month}-${day}`,
    year: String(date.getFullYear()),
  };
}

function parseTags(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getPostCategory(value: string | undefined, tags: string[]) {
  const categoryText = value?.trim();
  const source = [categoryText, ...tags].filter(Boolean).join(" ");

  if (/^(tech|technical|技术)$/i.test(categoryText || "")) {
    return blogCategories[0];
  }

  if (/^(diary|journal|日记)$/i.test(categoryText || "")) {
    return blogCategories[1];
  }

  if (/^(essay|notes|随笔)$/i.test(categoryText || "")) {
    return blogCategories[2];
  }

  if (/技术|代码|模型|研究|气象|启发式|工具|学业/.test(source)) {
    return blogCategories[0];
  }

  if (/日记|假期|出差|复习|生活/.test(source)) {
    return blogCategories[1];
  }

  return blogCategories[2];
}

function getPostBackgroundImage(value?: string) {
  const background = value?.trim();

  if (
    !background ||
    !isSafeImageSrc(background) ||
    /["'()\\]/.test(background)
  ) {
    return null;
  }

  return background;
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

  const rotationAttribute = getImageRotationAttribute(trimmedSrc);
  const sizeAttributes = [
    width && /^\d{1,5}$/.test(width) ? ` width="${width}"` : "",
    height && /^\d{1,5}$/.test(height) ? ` height="${height}"` : "",
    rotationAttribute,
  ].join("");

  return `<img src="${escapeHtml(trimmedSrc)}" alt="${escapeHtml(
    alt,
  )}"${sizeAttributes} loading="lazy" />`;
}

function renderBlockImage(source: string) {
  return `<figure class="blog-image">${source}</figure>`;
}

function getImageRotationAttribute(src: string) {
  const orientation = getLocalJpegOrientation(src);

  return orientation && orientation >= 5 && orientation <= 8
    ? ' data-image-rotation="quarter-turn"'
    : "";
}

function getLocalJpegOrientation(src: string) {
  if (!src.startsWith("/") || !/\.jpe?g$/i.test(src)) {
    return null;
  }

  const filePath = path.join(process.cwd(), "public", src.slice(1));

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const buffer = fs.readFileSync(filePath);

  if (buffer.readUInt16BE(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;

  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      break;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker === 0xe1) {
      return readExifOrientation(
        buffer.subarray(offset + 4, offset + 2 + length),
      );
    }

    offset += 2 + length;
  }

  return null;
}

function readExifOrientation(exif: Buffer) {
  if (exif.toString("ascii", 0, 6) !== "Exif\0\0") {
    return null;
  }

  const tiffOffset = 6;
  const byteOrder = exif.toString("ascii", tiffOffset, tiffOffset + 2);
  const littleEndian = byteOrder === "II";
  const readUInt16 = littleEndian
    ? (offset: number) => exif.readUInt16LE(offset)
    : (offset: number) => exif.readUInt16BE(offset);
  const readUInt32 = littleEndian
    ? (offset: number) => exif.readUInt32LE(offset)
    : (offset: number) => exif.readUInt32BE(offset);

  if (byteOrder !== "II" && byteOrder !== "MM") {
    return null;
  }

  const firstIfdOffset = tiffOffset + readUInt32(tiffOffset + 4);
  const entryCount = readUInt16(firstIfdOffset);

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = firstIfdOffset + 2 + index * 12;
    const tag = readUInt16(entryOffset);

    if (tag === 0x0112) {
      return readUInt16(entryOffset + 8);
    }
  }

  return null;
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
  const toc: BlogHeading[] = [];
  const paragraph: string[] = [];
  const list: string[] = [];
  let listTag: "ol" | "ul" = "ul";
  let codeLanguage = "";
  let codeLines: string[] = [];
  let headingIndex = 0;

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
      html.push(renderBlockImage(blockImage));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const id = `heading-${++headingIndex}`;
      const headingText = plainInlineText(heading[2]);

      if (level >= 2 && headingText) {
        toc.push({ id, level, text: headingText });
      }

      html.push(
        `<h${level} id="${id}">${formatInline(heading[2])}</h${level}>`,
      );
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

  return {
    html: html.join("\n"),
    toc,
  };
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

function plainInlineText(text: string) {
  return unescapeMarkdownPunctuation(text)
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_~<>]/g, "")
    .trim();
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
