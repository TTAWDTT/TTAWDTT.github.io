import type { GetStaticPaths, GetStaticProps } from "next";
import type { CSSProperties } from "react";

import {
  getBlogPost,
  getBlogPosts,
  getBlogSlugs,
  type BlogPost,
  type BlogPostMeta,
} from "@/lib/blog";
import { BlogShell } from "@/components/blog-shell";
import { SmoothLink } from "@/components/smooth-link";
import DefaultLayout from "@/layouts/default";

type PostPageProps = {
  post: BlogPost;
  posts: BlogPostMeta[];
};

const moodPalettes = [
  {
    names: ["浮躁", "焦虑"],
    background: "oklch(0.972 0.018 32)",
  },
  {
    names: ["停顿", "说明"],
    background: "oklch(0.976 0.012 86)",
  },
  {
    names: ["清醒", "平静"],
    background: "oklch(0.976 0.012 210)",
  },
  {
    names: ["漂移", "散乱"],
    background: "oklch(0.974 0.014 302)",
  },
];

function getMoodStyle(mood?: string) {
  const palette = moodPalettes.find(({ names }) =>
    names.some((name) => mood?.includes(name)),
  );

  return {
    "--blog-mood-bg": palette?.background ?? "transparent",
  } as CSSProperties;
}

export default function PostPage({ post, posts }: PostPageProps) {
  return (
    <DefaultLayout>
      <BlogShell
        activeSlug={post.slug}
        posts={posts}
        style={getMoodStyle(post.mood)}
        toc={post.toc}
      >
        <article className="blog-article">
          <h1 className="blog-article__title">{post.title}</h1>
          <div className="blog-article__meta">
            <time>{post.dateLabel}</time>
            <span>{post.distanceLabel}</span>
            {post.mood ? <span>{post.mood}</span> : null}
            {post.context ? <span>{post.context}</span> : null}
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: post.html }}
            className="blog-content"
          />
          <SmoothLink className="blog-article__back" href="/blog">
            ← 回到 {post.year} 的所有记录
          </SmoothLink>
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
