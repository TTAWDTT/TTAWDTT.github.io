import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";

export default function AboutPage() {
  return (
    <DefaultLayout>
      <section className="mx-auto flex max-w-3xl flex-col gap-5 py-8 md:py-10">
        <div>
          <h1 className={title()}>About</h1>
        </div>
        <p className="text-lg leading-8 text-muted">
          这里会放 TTAWDTT 的个人介绍、项目线索和长期维护的说明。等 logo
          到位后，我们可以把这里和首页一起收束成更完整的个人站气质。
        </p>
      </section>
    </DefaultLayout>
  );
}
