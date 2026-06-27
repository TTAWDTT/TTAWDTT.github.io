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
  description?: ReactNode;
  children: ReactNode;
};

const storageKey = "ttawdtt-blog-sidebar-collapsed";
let cachedSidebarCollapsed: boolean | null = null;

export function BlogShell({
  posts,
  activeSlug,
  description,
  children,
}: BlogShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => cachedSidebarCollapsed ?? false,
  );
  const layoutStyle = {
    "--blog-sidebar-width": isCollapsed ? "3rem" : "16rem",
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
          <div className="blog-sidebar__copy">
            <h1 className="blog-sidebar__title">Blog</h1>
            {description ? (
              <p className="blog-sidebar__description">{description}</p>
            ) : null}
          </div>
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
            className={
              !activeSlug
                ? "blog-nav-item blog-nav-item--active"
                : "blog-nav-item"
            }
            href="/blog"
          >
            <span>All Posts</span>
          </SmoothLink>
          {posts.map((post) => (
            <SmoothLink
              key={post.slug}
              aria-current={post.slug === activeSlug ? "page" : undefined}
              className={
                post.slug === activeSlug
                  ? "blog-nav-item blog-nav-item--active"
                  : "blog-nav-item"
              }
              href={`/blog/${post.slug}`}
            >
              <span>{post.title}</span>
            </SmoothLink>
          ))}
        </nav>
      </aside>

      <div className="blog-main">{children}</div>
    </section>
  );
}
