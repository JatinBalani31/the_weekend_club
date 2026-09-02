"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, Settings, ShieldCheck, User, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import copy from "@/content/en.json";

type NavBarProps = { isLoggedIn: boolean; userName?: string; isAdmin?: boolean };

const desktopLink = "flex min-h-11 items-center gap-2 py-3 transition-colors hover:text-accent";
const mobileLink = "min-h-12 border-b border-border py-3";

export default function NavBar({ isLoggedIn, userName, isAdmin }: NavBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-10">
        <Link
          href="/"
          className="flex min-h-11 items-center font-display text-lg uppercase tracking-[0.06em] text-text"
          onClick={close}
        >
          {copy.brand.name}
        </Link>

        <nav className="hidden items-center gap-6 font-body text-xs font-bold uppercase tracking-[0.12em] md:flex">
          <Link href="/" className={desktopLink}>{copy.navigation.home}</Link>
          <Link href="/events" className={desktopLink}>{copy.navigation.events}</Link>

          {isAdmin ? (
            <>
              <span className="flex items-center gap-2 py-3 text-accent"><ShieldCheck size={15} /> {copy.navigation.admin}</span>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className={buttonStyles("secondary", "sm")}><LogOut size={15} /> {copy.navigation.signOut}</button>
              </form>
            </>
          ) : isLoggedIn ? (
            <>
              <Link href="/account" className={desktopLink}><User size={15} /> {userName ?? copy.navigation.myAccount}</Link>
              <Link href="/account/settings" className={desktopLink}><Settings size={15} /> {copy.navigation.settings}</Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className={buttonStyles("secondary", "sm")}><LogOut size={15} /> {copy.navigation.signOut}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={desktopLink}>{copy.navigation.login}</Link>
              <Link href="/signup" className={buttonStyles("primary", "sm")}>{copy.navigation.signup}</Link>
            </>
          )}
        </nav>

        <button
          type="button"
          aria-label={isOpen ? copy.navigation.closeMenu : copy.navigation.openMenu}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-text transition-colors hover:bg-surface md:hidden"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <nav className="flex flex-col border-t border-border px-5 py-2 font-body text-sm font-bold uppercase tracking-[0.12em] md:hidden">
          <Link href="/" className={mobileLink} onClick={close}>{copy.navigation.home}</Link>
          <Link href="/events" className={mobileLink} onClick={close}>{copy.navigation.events}</Link>

          {isAdmin ? (
            <>
              <span className={`${mobileLink} flex items-center gap-2 text-accent`}><ShieldCheck size={15} /> {copy.navigation.admin}</span>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className="flex min-h-12 w-full items-center gap-2 py-3 text-left"><LogOut size={15} /> {copy.navigation.signOut}</button>
              </form>
            </>
          ) : isLoggedIn ? (
            <>
              <Link href="/account" className={`${mobileLink} flex items-center gap-2`} onClick={close}><User size={15} /> {userName ?? copy.navigation.myAccount}</Link>
              <Link href="/account/settings" className={`${mobileLink} flex items-center gap-2`} onClick={close}><Settings size={15} /> {copy.navigation.settings}</Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="flex min-h-12 w-full items-center gap-2 py-3 text-left"><LogOut size={15} /> {copy.navigation.signOut}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={mobileLink} onClick={close}>{copy.navigation.login}</Link>
              <Link href="/signup" className="min-h-12 py-3 text-accent" onClick={close}>{copy.navigation.signup}</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
