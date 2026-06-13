import localFont from "next/font/local";

export const fontSans = localFont({
  src: [
    {
      path: "../public/fonts/LXGWWenKai-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/LXGWWenKai-Medium.ttf",
      weight: "500 700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = localFont({
  src: "../public/fonts/LXGWWenKaiMono-Regular.ttf",
  variable: "--font-mono",
  display: "swap",
});
