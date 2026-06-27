import type { GetStaticProps } from "next";

import { BlogShell } from "@/components/blog-shell";
import { SmoothLink } from "@/components/smooth-link";
import { getBlogPosts, type BlogPostMeta } from "@/lib/blog";
import DefaultLayout from "@/layouts/default";

type BlogPageProps = {
  posts: BlogPostMeta[];
};

export default function BlogPage({ posts }: BlogPageProps) {
  return (
    <DefaultLayout>
      <BlogShell posts={posts}>
        <section className="blog-index">
          <header className="blog-index__header">
            <div>
              <h1>All Posts</h1>
              <p>{posts.length} notes</p>
            </div>
          </header>

          {posts.length ? (
            <div className="blog-index__list">
              {posts.map((post, index) => (
                <SmoothLink
                  key={post.slug}
                  className="blog-index__item"
                  href={`/blog/${post.slug}`}
                >
                  <span className="blog-index__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="blog-index__body">
                    <span className="blog-index__title">{post.title}</span>
                    <span className="blog-index__excerpt">{post.excerpt}</span>
                  </span>
                </SmoothLink>
              ))}
            </div>
          ) : (
            <div className="blog-empty">
              还没有文章。把 Markdown 文件放进{" "}
              <code className="font-mono">content/blog</code> 后重新构建即可。
            </div>
          )}
        </section>
      </BlogShell>
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
