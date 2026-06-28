import type { CSSProperties } from "react";

import { Head } from "./head";

import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
  backgroundImage,
  children,
  moodTheme,
}: {
  backgroundImage?: string | null;
  children: React.ReactNode;
  moodTheme?: string;
}) {
  const style = backgroundImage
    ? ({
        "--site-background-image": `url("${backgroundImage}")`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="site-frame relative flex min-h-screen flex-col"
      data-has-background-image={backgroundImage ? "true" : undefined}
      data-mood-theme={moodTheme}
      style={style}
    >
      <Head />
      <Navbar />
      <main className="container mx-auto max-w-7xl flex-grow px-6 pt-16">
        {children}
      </main>
      <footer className="flex w-full items-center justify-center py-3 text-sm text-muted">
        Developed by <span className="ml-1 text-accent">TTAWDTT</span>
      </footer>
    </div>
  );
}
