import type { GetStaticProps } from "next";

import { GithubIcon } from "@/components/icons";
import { SmoothLink } from "@/components/smooth-link";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getBlogPosts, type BlogPostMeta } from "@/lib/blog";
import { pickDailyLine } from "@/lib/site-lines";

type IndexPageProps = {
  dailyLine: string;
  recentPosts: BlogPostMeta[];
};

export default function IndexPage({ dailyLine, recentPosts }: IndexPageProps) {
  return (
    <DefaultLayout>
      <section className="home-journal">
        <div className="home-journal__identity">
          <img alt="TTAWDTT" src="/logo.png" />
          <div>
            <p className="home-journal__eyebrow">TTAWDTT / Zhen Luo</p>
            <h1>still running.</h1>
            <p className="home-journal__line">{dailyLine}</p>
          </div>
        </div>

        <div className="home-current">
          <div className="home-current__row">
            <span>reading</span>
            <p>Fourier / climate / reinforcement learning</p>
          </div>
          <div className="home-current__row">
            <span>writing</span>
            <p>scattered notes, research fragments, quiet records</p>
          </div>
          <div className="home-current__row">
            <span>distance</span>
            <p>measuring the road by days and unfinished thoughts</p>
          </div>
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

        <div className="home-links">
          <SmoothLink href="/blog">Read Blog</SmoothLink>
          <a
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
      dailyLine: pickDailyLine(),
      recentPosts: getBlogPosts().slice(0, 4),
    },
  };
};
