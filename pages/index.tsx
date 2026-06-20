import { siteConfig } from "@/config/site";
import { subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="flex max-w-xl flex-col items-center text-center">
          <img
            alt="TTAWDTT"
            className="h-40 w-40 rounded-full object-cover md:h-56 md:w-56"
            src="/logo.png"
          />
          <div className={subtitle({ class: "mt-6 text-2xl md:text-3xl" })}>
            你好，我是TTAWDTT（Zhen Luo）
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
      </section>
    </DefaultLayout>
  );
}
