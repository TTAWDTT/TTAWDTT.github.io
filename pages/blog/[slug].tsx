import type { GetStaticPaths, GetStaticProps } from "next";

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

const moodThemes = [
  { key: "restless", names: ["浮躁", "焦虑", "发散", "摇晃"] },
  { key: "still", names: ["停顿", "说明", "安静", "沉默"] },
  { key: "clear", names: ["清醒", "平静", "观察", "推演"] },
  { key: "drift", names: ["漂移", "散乱", "游离", "梦"] },
];

function getMoodTheme(mood?: string) {
  return moodThemes.find(({ names }) =>
    names.some((name) => mood?.includes(name)),
  )?.key;
}

export default function PostPage({ post, posts }: PostPageProps) {
  const moodTheme = post.backgroundImage ? undefined : getMoodTheme(post.mood);

  return (
    <DefaultLayout backgroundImage={post.backgroundImage} moodTheme={moodTheme}>
      <BlogShell
        activeCategoryKey={post.category.key}
        activeSlug={post.slug}
        posts={posts}
        toc={post.toc}
      >
        <article
          className="blog-article"
          data-blog-category={post.category.key}
        >
          <h1 className="blog-article__title">{post.title}</h1>
          <div className="blog-article__meta">
            <span>{post.category.label}</span>
            <time>{post.dateLabel}</time>
            <span>{post.distanceLabel}</span>
            {post.mood ? <span>{post.mood}</span> : null}
            {post.context ? <span>{post.context}</span> : null}
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: post.html }}
            className="blog-content"
          />
          <SmoothLink
            className="blog-article__back"
            href={`/blog/category/${post.category.key}`}
          >
            ← 回到 {post.category.label}
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
