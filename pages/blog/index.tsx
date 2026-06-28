import type { GetStaticProps } from "next";

import { BlogShell } from "@/components/blog-shell";
import { SmoothLink } from "@/components/smooth-link";
import { getBlogPosts, type BlogPostMeta } from "@/lib/blog";
import DefaultLayout from "@/layouts/default";

type BlogPageProps = {
  posts: BlogPostMeta[];
};

const groupPostsByYear = (posts: BlogPostMeta[]) =>
  posts.reduce<Record<string, BlogPostMeta[]>>((groups, post) => {
    groups[post.year] = [...(groups[post.year] || []), post];

    return groups;
  }, {});

export default function BlogPage({ posts }: BlogPageProps) {
  const postsByYear = groupPostsByYear(posts);
  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <DefaultLayout>
      <BlogShell posts={posts}>
        <section className="blog-index">
          <header className="blog-index__header">
            <div>
              <h1>Archives</h1>
              <p>目前共计 {posts.length} 篇日志。</p>
            </div>
          </header>

          {posts.length ? (
            <div className="blog-index__list">
              {years.map((year) => (
                <section key={year} className="blog-archive">
                  <h2 className="blog-archive__year">{year}</h2>
                  <div className="blog-archive__items">
                    {postsByYear[year].map((post) => (
                      <SmoothLink
                        key={post.slug}
                        className="blog-archive__item"
                        href={`/blog/${post.slug}`}
                      >
                        <time className="blog-archive__date">
                          {post.dateLabel}
                        </time>
                        <span className="blog-archive__body">
                          <span className="blog-archive__title">
                            {post.title}
                          </span>
                        </span>
                      </SmoothLink>
                    ))}
                  </div>
                </section>
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
