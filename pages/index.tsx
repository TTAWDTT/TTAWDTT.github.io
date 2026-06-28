import type { GetStaticProps } from "next";

import { GithubIcon } from "@/components/icons";
import { subtitle } from "@/components/primitives";
import { SmoothLink } from "@/components/smooth-link";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getBlogPosts, type BlogPostMeta } from "@/lib/blog";

type IndexPageProps = {
  recentPosts: BlogPostMeta[];
};

export default function IndexPage({ recentPosts }: IndexPageProps) {
  return (
    <DefaultLayout>
      <section className="home-landing">
        <div className="home-landing__hero">
          <img alt="TTAWDTT" className="home-landing__logo" src="/logo.png" />
          <div className={subtitle({ class: "home-landing__subtitle" })}>
            你好，我是TTAWDTT（Zhen Luo）
          </div>

          <div className="home-recent">
            <div className="home-recent__top">
              <p>recently</p>
              <SmoothLink href="/blog">archives</SmoothLink>
            </div>
            {recentPosts.map((post) => (
              <SmoothLink
                key={post.slug}
                className="home-recent__item"
                href={`/blog/${post.slug}`}
              >
                <span>{post.dateLabel}</span>
                <strong>{post.title}</strong>
                {post.mood ? <em>{post.mood}</em> : null}
              </SmoothLink>
            ))}
          </div>
        </div>

        <div className="home-landing__links">
          <SmoothLink
            className="button button--primary button--md"
            href="/blog"
          >
            Read Blog
          </SmoothLink>
          <a
            className="button button--tertiary button--md"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubIcon size={20} />
            GitHub
          </a>
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  return {
    props: {
      recentPosts: getBlogPosts().slice(0, 4),
    },
  };
};
