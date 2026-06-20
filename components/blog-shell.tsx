import type { BlogPostMeta } from "@/lib/blog";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import Link from "next/link";

import { PanelToggleIcon } from "@/components/icons";

type BlogShellProps = {
  posts: BlogPostMeta[];
  activeSlug?: string;
  description?: ReactNode;
  children: ReactNode;
};

const storageKey = "ttawdtt-blog-sidebar-collapsed";

export function BlogShell({
  posts,
  activeSlug,
  description,
  children,
}: BlogShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsCollapsed(localStorage.getItem(storageKey) === "true");
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;

      localStorage.setItem(storageKey, String(next));

      return next;
    });
  };

  return (
    <section
      className={
        isCollapsed ? "blog-shell blog-shell--collapsed" : "blog-shell"
      }
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
            aria-label={
              isCollapsed
                ? "Expand blog navigation"
                : "Collapse blog navigation"
            }
            className="blog-sidebar__toggle"
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
          <Link
            className={
              !activeSlug
                ? "blog-nav-item blog-nav-item--active"
                : "blog-nav-item"
            }
            href="/blog"
          >
            <span>All Posts</span>
          </Link>
          {posts.map((post) => (
            <Link
              key={post.slug}
              className={
                post.slug === activeSlug
                  ? "blog-nav-item blog-nav-item--active"
                  : "blog-nav-item"
              }
              href={`/blog/${post.slug}`}
            >
              <span>{post.title}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div key={activeSlug || "index"} className="blog-main">
        {children}
      </div>
    </section>
  );
}
