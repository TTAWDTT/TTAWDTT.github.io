import type { AppProps } from "next/app";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/router";

import "@/styles/globals.css";

const isBlogRoute = (path: string) =>
  path === "/blog" || path.startsWith("/blog/");

const scrollBlogMainToTop = () => {
  document.querySelector(".blog-main__scroll")?.scrollTo(0, 0);
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleStart = (url: string) => {
      if (isBlogRoute(url) && isBlogRoute(router.asPath)) {
        document.documentElement.dataset.blogTransition = "leaving";
      }
    };

    const handleComplete = (url: string) => {
      if (!isBlogRoute(url)) {
        delete document.documentElement.dataset.blogTransition;

        return;
      }

      scrollBlogMainToTop();
      document.documentElement.dataset.blogTransition = "entering";

      window.setTimeout(() => {
        delete document.documentElement.dataset.blogTransition;
      }, 180);
    };

    const handleError = () => {
      delete document.documentElement.dataset.blogTransition;
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleError);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleError);
    };
  }, [router]);

  return (
    <NextThemesProvider attribute="class" defaultTheme="light">
      <div className="page-transition-shell">
        <Component {...pageProps} />
      </div>
    </NextThemesProvider>
  );
}
