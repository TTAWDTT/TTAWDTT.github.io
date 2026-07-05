import type { BlogHeading, BlogPostMeta } from "@/lib/blog";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@heroui/react";
import clsx from "clsx";

import { PanelToggleIcon } from "@/components/icons";
import { SmoothLink } from "@/components/smooth-link";
import { blogCategories } from "@/lib/blog-categories";

type BlogShellProps = {
  posts: BlogPostMeta[];
  activeCategoryKey?: string;
  activeSlug?: string;
  toc?: BlogHeading[];
  children: ReactNode;
};

const storageKey = "ttawdtt-blog-sidebar-collapsed";
let cachedSidebarCollapsed: boolean | null = null;

export function BlogShell({
  activeCategoryKey,
  posts,
  activeSlug,
  toc = [],
  children,
}: BlogShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => cachedSidebarCollapsed ?? false,
  );
  const [activeHeadingId, setActiveHeadingId] = useState(toc[0]?.id);
  const hasToc = toc.length > 0;
  const visiblePosts = activeCategoryKey
    ? posts.filter((post) => post.category.key === activeCategoryKey)
    : posts;
  const layoutStyle = {
    "--blog-sidebar-width": isCollapsed ? "4.5rem" : "15rem",
  } as CSSProperties;

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.dataset.blogLayout = "fixed";

    if (cachedSidebarCollapsed === null) {
      cachedSidebarCollapsed = localStorage.getItem(storageKey) === "true";
    }

    setIsCollapsed(cachedSidebarCollapsed);

    return () => {
      delete document.documentElement.dataset.blogLayout;
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;

      cachedSidebarCollapsed = next;
      localStorage.setItem(storageKey, String(next));

      return next;
    });
  };

  useEffect(() => {
    if (!hasToc) {
      return;
    }

    setActiveHeadingId(toc[0]?.id);

    const headings = toc
      .map((heading) => document.getElementById(heading.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeading = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .at(0);

        if (visibleHeading?.target.id) {
          setActiveHeadingId(visibleHeading.target.id);
        }
      },
      {
        root: document.querySelector(".blog-main__scroll"),
        rootMargin: "-18% 0px -70% 0px",
        threshold: 0,
      },
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [hasToc, toc]);

  useEffect(() => {
    const content = document.querySelector(".blog-content");

    if (!content) {
      return;
    }

    let frame = 0;
    const figures = Array.from(
      content.querySelectorAll<HTMLElement>(".blog-image"),
    );
    const images = figures
      .map((figure) => figure.querySelector("img"))
      .filter((image): image is HTMLImageElement => Boolean(image));

    const arrangeImages = () => {
      const portraitFigures = new Set<HTMLElement>();

      figures.forEach((figure) => {
        const image = figure.querySelector("img");
        const isPortrait =
          image &&
          image.naturalWidth > 0 &&
          image.naturalHeight / image.naturalWidth >= 1.12;

        delete figure.dataset.orientation;
        delete figure.dataset.portraitPair;

        if (isPortrait) {
          figure.dataset.orientation = "portrait";
          portraitFigures.add(figure);
        } else if (image?.naturalWidth) {
          figure.dataset.orientation = "landscape";
        }
      });

      let run: HTMLElement[] = [];
      const flushRun = () => {
        for (let index = 0; index + 1 < run.length; index += 2) {
          run[index].dataset.portraitPair = "true";
          run[index + 1].dataset.portraitPair = "true";
        }

        run = [];
      };

      figures.forEach((figure) => {
        if (portraitFigures.has(figure)) {
          run.push(figure);

          return;
        }

        flushRun();
      });
      flushRun();
    };

    const scheduleArrange = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(arrangeImages);
    };

    images.forEach((image) => {
      if (image.complete) {
        scheduleArrange();
      }

      image.addEventListener("load", scheduleArrange);
    });
    scheduleArrange();

    return () => {
      window.cancelAnimationFrame(frame);
      images.forEach((image) => {
        image.removeEventListener("load", scheduleArrange);
      });
    };
  }, [activeSlug]);

  return (
    <section
      className={clsx(
        "blog-shell",
        isCollapsed && "blog-shell--collapsed",
        hasToc && "blog-shell--with-toc",
      )}
      style={layoutStyle}
    >
      <aside aria-label="Blog navigation" className="blog-sidebar">
        <div className="blog-sidebar__top">
          <span className="blog-sidebar__title">Blog</span>
          <Button
            isIconOnly
            aria-label={
              isCollapsed
                ? "Expand blog navigation"
                : "Collapse blog navigation"
            }
            className="blog-sidebar__toggle"
            size="sm"
            variant="tertiary"
            onPress={toggleSidebar}
          >
            <PanelToggleIcon
              className={
                isCollapsed
                  ? "blog-sidebar__toggle-icon is-collapsed"
                  : "blog-sidebar__toggle-icon"
              }
            />
          </Button>
        </div>

        <nav aria-label="Blog posts" className="blog-sidebar__nav">
          <SmoothLink
            aria-current={
              !activeSlug && !activeCategoryKey ? "page" : undefined
            }
            className={clsx(
              "blog-nav-item group",
              !activeSlug && !activeCategoryKey && "blog-nav-item--active",
            )}
            href="/blog"
            title="All Posts"
          >
            <span className="blog-nav-item__dot" />
            <span className="blog-nav-item__label">All Posts</span>
          </SmoothLink>

          <div aria-label="Blog categories" className="blog-nav-group">
            {blogCategories.map((category) => (
              <SmoothLink
                key={category.key}
                aria-current={
                  activeCategoryKey === category.key && !activeSlug
                    ? "page"
                    : undefined
                }
                className={clsx(
                  "blog-nav-item blog-nav-item--category group",
                  activeCategoryKey === category.key &&
                    !activeSlug &&
                    "blog-nav-item--active",
                )}
                href={`/blog/category/${category.key}`}
                title={category.label}
              >
                <span className="blog-nav-item__dot" />
                <span className="blog-nav-item__label">{category.label}</span>
              </SmoothLink>
            ))}
          </div>

          {visiblePosts.map((post) => (
            <SmoothLink
              key={post.slug}
              aria-current={post.slug === activeSlug ? "page" : undefined}
              className={clsx(
                "blog-nav-item group",
                post.slug === activeSlug && "blog-nav-item--active",
              )}
              href={`/blog/${post.slug}`}
              title={post.title}
            >
              <span className="blog-nav-item__dot" />
              <span className="blog-nav-item__label">{post.title}</span>
            </SmoothLink>
          ))}
        </nav>
      </aside>

      <main className="blog-main">
        <div className="blog-main__scroll">{children}</div>
      </main>

      {hasToc ? (
        <aside aria-label="Article table of contents" className="blog-toc">
          <p className="blog-toc__title">目录</p>
          <nav className="blog-toc__nav">
            {toc.map((heading) => (
              <a
                key={heading.id}
                className={clsx(
                  "blog-toc__item",
                  heading.level > 2 && "blog-toc__item--nested",
                  heading.id === activeHeadingId && "blog-toc__item--active",
                )}
                href={`#${heading.id}`}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}
    </section>
  );
}
