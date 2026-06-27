import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

type SmoothLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

const isModifiedEvent = (event: MouseEvent<HTMLAnchorElement>) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0;

const isBlogRoute = (href: string) =>
  href === "/blog" || href.startsWith("/blog/");

export function SmoothLink({
  href,
  children,
  onClick,
  target,
  ...props
}: SmoothLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      target === "_blank" ||
      isModifiedEvent(event) ||
      href.startsWith("http") ||
      href.startsWith("#") ||
      router.asPath === href
    ) {
      return;
    }

    event.preventDefault();
    const shouldUseBlogTransition =
      isBlogRoute(href) && isBlogRoute(router.asPath);

    if (shouldUseBlogTransition) {
      document.documentElement.dataset.blogTransition = "leaving";
      router.push(href, undefined, { scroll: false });

      return;
    }

    router.push(href);
  };

  return (
    <Link {...props} href={href} target={target} onClick={handleClick}>
      {children}
    </Link>
  );
}
