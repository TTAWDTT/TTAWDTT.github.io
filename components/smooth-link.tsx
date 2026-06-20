import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

type SmoothLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

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
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      href.startsWith("http") ||
      href.startsWith("#") ||
      router.asPath === href
    ) {
      return;
    }

    event.preventDefault();
    router.push(href);
  };

  return (
    <Link {...props} href={href} target={target} onClick={handleClick}>
      {children}
    </Link>
  );
}
