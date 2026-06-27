import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

type SmoothLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => Promise<void> | void) => {
    finished: Promise<void>;
  };
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

    const transitionDocument = document as ViewTransitionDocument;
    const shouldUseBlogTransition =
      isBlogRoute(href) && isBlogRoute(router.asPath);

    if (shouldUseBlogTransition && transitionDocument.startViewTransition) {
      document.documentElement.dataset.routeTransition = "blog";

      const transition = transitionDocument.startViewTransition(async () => {
        await router.push(href, undefined, { scroll: false });
      });

      transition.finished.finally(() => {
        delete document.documentElement.dataset.routeTransition;
        window.scrollTo(0, 0);
      });

      return;
    }

    if (shouldUseBlogTransition) {
      document.documentElement.dataset.routeTransition = "blog-fallback";

      window.setTimeout(() => {
        router.push(href, undefined, { scroll: false }).finally(() => {
          window.scrollTo(0, 0);
          window.setTimeout(() => {
            delete document.documentElement.dataset.routeTransition;
          }, 220);
        });
      }, 90);

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
