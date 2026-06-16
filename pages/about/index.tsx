import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { Card } from "@heroui/react"

export default function AboutPage() {
  return (
    <DefaultLayout>
      <section className="mx-auto flex max-w-3xl flex-col gap-5 py-8 md:py-10  items-center justify-center">
        <div>
          <h1 className={title()}>About</h1>
        </div>
        <img
          alt="TTAWDTT"
          className="h-40 w-40 rounded-full object-cover md:h-56 md:w-56"
          src="/logo.png"
          />
        <p className="text-lg leading-8 text-muted">
          你好~
        </p>
        <p className="text-lg leading-8 text-muted">
          我是TTAWDTT，你也可以直呼我的大名Zhen Luo
        </p>
        <p>我是一名本科生，同时是一名researcher。我的研究领域包括：</p>
        <Card className="w-[320px] justify-center items-center" variant="default">
          <Card.Content>
            <ul>
              <li>表征学习</li>
              <li>Agent</li>
              <li>大语言模型</li>
              <li>气象预报</li>
            </ul>
          </Card.Content>
        </Card>
      </section>
    </DefaultLayout>
  );
}
