import { useState } from "react";
import { Link } from "@heroui/react";
import clsx from "clsx";
import { useRouter } from "next/router";

import { GithubIcon } from "@/components/icons";
import { SmoothLink } from "@/components/smooth-link";
import { ThemeSwitch } from "@/components/theme-switch";
import { siteConfig } from "@/config/site";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const isActivePath = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-separator bg-background/85 shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_5%,transparent)] backdrop-blur-lg">
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SmoothLink className="brand-link flex items-center gap-1" href="/">
            <p className="font-bold text-inherit">{siteConfig.name}</p>
          </SmoothLink>
          <ul className="hidden lg:flex gap-2 ml-1">
            {siteConfig.navItems.map((item) => (
              <li key={item.href}>
                <SmoothLink
                  className={clsx(
                    "nav-link text-foreground",
                    isActivePath(item.href) && "nav-link--active text-accent",
                  )}
                  href={item.href}
                >
                  {item.label}
                </SmoothLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <SmoothLink aria-label="Home" className="avatar-link" href="/">
            <img
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-full object-cover"
              src="/logo.png"
            />
          </SmoothLink>
          <Link
            aria-label="Github"
            className="icon-link"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubIcon className="text-muted" />
          </Link>
          <ThemeSwitch className="icon-link" />
        </div>

        <div className="flex sm:hidden items-center gap-1">
          <SmoothLink aria-label="Home" className="avatar-link" href="/">
            <img
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-full object-cover"
              src="/logo.png"
            />
          </SmoothLink>
          <Link
            aria-label="Github"
            className="icon-link"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubIcon className="text-muted" />
          </Link>
          <ThemeSwitch className="icon-link" />
          <button
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
            className="icon-link"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              ) : (
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              )}
            </svg>
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="border-t border-separator sm:hidden">
          <ul className="flex flex-col gap-2 px-4 py-4">
            {siteConfig.navMenuItems.map((item) => (
              <li key={item.href}>
                <SmoothLink
                  className={clsx(
                    "nav-link block py-2 text-lg text-foreground",
                    isActivePath(item.href) && "nav-link--active text-accent",
                  )}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </SmoothLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
};
