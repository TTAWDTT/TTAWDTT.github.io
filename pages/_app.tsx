import type { AppProps } from "next/app";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/router";

import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <NextThemesProvider attribute="class" defaultTheme="light">
      <div key={router.asPath} className="page-transition-shell">
        <Component {...pageProps} />
      </div>
    </NextThemesProvider>
  );
}
