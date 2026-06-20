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
      <BlogShell
        description={
          <>
            目录来自 <code className="font-mono">content/blog</code> 中的
            Markdown 文件。
          </>
        }
        posts={posts}
      >
        <div className="blog-list">
          {posts.length > 0 ? (
            posts.map((post) => (
              <SmoothLink
                key={post.slug}
                className="blog-card"
                href={`/blog/${post.slug}`}
              >
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
              </SmoothLink>
            ))
          ) : (
            <div className="blog-empty">
              还没有文章。把 Markdown 文件放进{" "}
              <code className="font-mono">content/blog</code> 后重新构建即可。
            </div>
          )}
        </div>
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
