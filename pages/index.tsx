import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-xl text-center justify-center">
          <span className={title()}>TTAWDTT&nbsp;</span>
          <span className={title({ color: "blue" })}>写作与实验&nbsp;</span>
          <br />
          <span className={title()}>慢慢整理那些正在发生的想法。</span>
          <div className={subtitle({ class: "mt-4" })}>
            文章、笔记、项目碎片和一些认真生活的记录。
          </div>
        </div>

        <div className="flex gap-3">
          <a
            className="button button--primary button--md rounded-full"
            href="/blog"
          >
            Read Blog
          </a>
          <a
            className="button button--tertiary button--md rounded-full"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubIcon size={20} />
            GitHub
          </a>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 rounded-xl bg-surface shadow-surface px-4 py-2">
            <pre className="text-sm font-medium font-mono">
              Add posts in{" "}
              <code className="px-2 py-1 h-fit font-mono font-normal inline whitespace-nowrap rounded-sm bg-accent/20 text-accent text-sm">
                content/blog
              </code>
            </pre>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
