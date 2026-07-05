import type { GetStaticPaths, GetStaticProps } from "next";

import { BlogShell } from "@/components/blog-shell";
import { SmoothLink } from "@/components/smooth-link";
import {
  getBlogCategory,
  getBlogCategoryPaths,
  type BlogCategory,
} from "@/lib/blog-categories";
import { getBlogPosts, type BlogPostMeta } from "@/lib/blog";
import DefaultLayout from "@/layouts/default";

type CategoryPageProps = {
  category: BlogCategory;
  posts: BlogPostMeta[];
};

const groupPostsByYear = (posts: BlogPostMeta[]) =>
  posts.reduce<Record<string, BlogPostMeta[]>>((groups, post) => {
    groups[post.year] = [...(groups[post.year] || []), post];

    return groups;
  }, {});

export default function CategoryPage({ category, posts }: CategoryPageProps) {
  const categoryPosts = posts.filter(
    (post) => post.category.key === category.key,
  );
  const postsByYear = groupPostsByYear(categoryPosts);
  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <DefaultLayout>
      <BlogShell activeCategoryKey={category.key} posts={posts}>
        <section className="blog-index" data-blog-category={category.key}>
          <header className="blog-index__header">
            <div>
              <h1>{category.label}</h1>
              <p>
                {category.description} 共计 {categoryPosts.length} 篇。
              </p>
            </div>
          </header>

          {categoryPosts.length ? (
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
            <div className="blog-empty">这个门类还没有文章。</div>
          )}
        </section>
      </BlogShell>
    </DefaultLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: getBlogCategoryPaths().map((category) => ({
      params: { category },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<CategoryPageProps> = async ({
  params,
}) => {
  const category = getBlogCategory(String(params?.category));

  if (!category) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      category,
      posts: getBlogPosts(),
    },
  };
};
