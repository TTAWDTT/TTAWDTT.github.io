import { Head } from "./head";

import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
  children,
  moodTheme,
}: {
  children: React.ReactNode;
  moodTheme?: string;
}) {
  return (
    <div
      className="site-frame relative flex min-h-screen flex-col"
      data-mood-theme={moodTheme}
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
