import type { GetStaticProps } from "next";

import Link from "next/link";

import { getBlogPosts, type BlogPostMeta } from "@/lib/blog";
import { subtitle, title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";

type BlogPageProps = {
  posts: BlogPostMeta[];
};

export default function BlogPage({ posts }: BlogPageProps) {
  return (
    <DefaultLayout>
      <section className="grid gap-8 py-8 md:grid-cols-[260px_1fr] md:py-10">
        <aside className="md:sticky md:top-24 md:h-fit">
          <h1 className={title()}>Blog</h1>
          <p className={subtitle({ class: "mt-3 text-base" })}>
            左侧目录来自 <code className="font-mono">content/blog</code> 中的
            Markdown 文件。
          </p>
        </aside>

        <div className="grid gap-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Link
                key={post.slug}
                className="group block rounded-lg border border-separator bg-surface px-5 py-4 no-underline transition-colors hover:border-accent"
                href={`/blog/${post.slug}`}
              >
                <h2 className="text-xl font-medium text-foreground transition-colors group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-muted">{post.excerpt}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-separator bg-surface px-5 py-4 text-muted">
              还没有文章。把 Markdown 文件放进{" "}
              <code className="font-mono">content/blog</code> 后重新构建即可。
            </div>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<BlogPageProps> = async () => {
  return {
    props: {
      posts: getBlogPosts(),
    },
  };
};
