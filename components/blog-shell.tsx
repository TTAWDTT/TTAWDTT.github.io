import type { BlogPostMeta } from "@/lib/blog";

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@heroui/react";
import clsx from "clsx";

import { PanelToggleIcon } from "@/components/icons";
import { SmoothLink } from "@/components/smooth-link";

type BlogShellProps = {
  posts: BlogPostMeta[];
  activeSlug?: string;
  children: ReactNode;
};

const storageKey = "ttawdtt-blog-sidebar-collapsed";
let cachedSidebarCollapsed: boolean | null = null;

export function BlogShell({ posts, activeSlug, children }: BlogShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => cachedSidebarCollapsed ?? false,
  );
  const layoutStyle = {
    "--blog-sidebar-width": isCollapsed ? "4.5rem" : "15rem",
  } as CSSProperties;

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (cachedSidebarCollapsed === null) {
      cachedSidebarCollapsed = localStorage.getItem(storageKey) === "true";
    }

    setIsCollapsed(cachedSidebarCollapsed);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;

      cachedSidebarCollapsed = next;
      localStorage.setItem(storageKey, String(next));

      return next;
    });
  };

  return (
    <section
      className={clsx("blog-shell", isCollapsed && "blog-shell--collapsed")}
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
            aria-current={!activeSlug ? "page" : undefined}
            className={clsx(
              "blog-nav-item group",
              !activeSlug && "blog-nav-item--active",
            )}
            href="/blog"
            title="All Posts"
          >
            <span className="blog-nav-item__dot" />
            <span className="blog-nav-item__label">All Posts</span>
          </SmoothLink>
          {posts.map((post) => (
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

      <div key={activeSlug ?? "index"} className="blog-main">
        {children}
      </div>
    </section>
  );
}
