import type { GetStaticPaths, GetStaticProps } from "next";

import Link from "next/link";

import {
  getBlogPost,
  getBlogPosts,
  getBlogSlugs,
  type BlogPost,
  type BlogPostMeta,
} from "@/lib/blog";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";

type PostPageProps = {
  post: BlogPost;
  posts: BlogPostMeta[];
};

export default function PostPage({ post, posts }: PostPageProps) {
  return (
    <DefaultLayout>
      <section className="grid gap-8 py-8 md:grid-cols-[260px_1fr] md:py-10">
        <aside className="md:sticky md:top-24 md:h-fit">
          <Link
            className="text-sm text-muted no-underline hover:text-accent"
            href="/blog"
          >
            Back to Blog
          </Link>
          <nav className="mt-5 grid gap-2">
            {posts.map((item) => (
              <Link
                key={item.slug}
                className={
                  item.slug === post.slug
                    ? "rounded-md bg-accent/10 px-3 py-2 text-accent no-underline"
                    : "rounded-md px-3 py-2 text-muted no-underline hover:bg-surface hover:text-foreground"
                }
                href={`/blog/${item.slug}`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="mx-auto w-full max-w-4xl">
          <h1 className={title({ fullWidth: true })}>{post.title}</h1>
          <div
            dangerouslySetInnerHTML={{ __html: post.html }}
            className="blog-content mt-8"
          />
        </article>
      </section>
    </DefaultLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: getBlogSlugs().map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PostPageProps> = async ({
  params,
}) => {
  const slug = String(params?.slug);

  return {
    props: {
      post: getBlogPost(slug),
      posts: getBlogPosts(),
    },
  };
};
