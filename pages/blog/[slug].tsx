import type { GetStaticPaths, GetStaticProps } from "next";

import {
  getBlogPost,
  getBlogPosts,
  getBlogSlugs,
  type BlogPost,
  type BlogPostMeta,
} from "@/lib/blog";
import { BlogShell } from "@/components/blog-shell";
import DefaultLayout from "@/layouts/default";

type PostPageProps = {
  post: BlogPost;
  posts: BlogPostMeta[];
};

export default function PostPage({ post, posts }: PostPageProps) {
  return (
    <DefaultLayout>
      <BlogShell activeSlug={post.slug} posts={posts} toc={post.toc}>
        <article className="blog-article">
          <h1 className="blog-article__title">{post.title}</h1>
          <div
            dangerouslySetInnerHTML={{ __html: post.html }}
            className="blog-content"
          />
        </article>
      </BlogShell>
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
