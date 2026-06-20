import type { AppProps } from "next/app";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light">
      <div className="page-transition-shell">
        <Component {...pageProps} />
      </div>
    </NextThemesProvider>
  );
}
