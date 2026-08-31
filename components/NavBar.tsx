"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, Settings, ShieldCheck, User, X } from "lucide-react";
import copy from "@/content/en.json";

type NavBarProps = { isLoggedIn: boolean; userName?: string; isAdmin?: boolean };

export default function NavBar({ isLoggedIn, userName, isAdmin }: NavBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-10">
        <Link href="/" className="flex min-h-11 items-center text-sm font-black uppercase tracking-[0.14em]" onClick={close}>
          {copy.brand.name}
        </Link>

        <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-wider md:flex">
          <Link href="/" className="min-h-11 py-3 transition-colors hover:text-accent">{copy.navigation.home}</Link>
          <Link href="/events" className="min-h-11 py-3 transition-colors hover:text-accent">{copy.navigation.events}</Link>

          {isAdmin ? (
            <>
              <span className="flex items-center gap-2 py-3 text-accent"><ShieldCheck size={15} /> {copy.navigation.admin}</span>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className="flex min-h-11 items-center gap-2 border border-ink/25 px-3 py-2 transition-colors hover:border-ink/60"><LogOut size={15} /> Sign out</button>
              </form>
            </>
          ) : isLoggedIn ? (
            <>
              <Link href="/account" className="flex min-h-11 items-center gap-2 py-3 transition-colors hover:text-accent"><User size={15} /> {userName ?? copy.navigation.myAccount}</Link>
              <Link href="/account/settings" className="flex min-h-11 items-center gap-2 py-3 transition-colors hover:text-accent"><Settings size={15} /> {copy.navigation.settings}</Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="flex min-h-11 items-center gap-2 border border-ink/25 px-3 py-2 transition-colors hover:border-ink/60"><LogOut size={15} /> Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="min-h-11 py-3 transition-colors hover:text-accent">{copy.navigation.login}</Link>
              <Link href="/signup" className="flex min-h-11 items-center bg-accent px-4 text-ink transition-opacity hover:opacity-90">{copy.navigation.signup}</Link>
            </>
          )}
        </nav>

        <button type="button" aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)} className="flex min-h-11 min-w-11 items-center justify-center md:hidden">
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <nav className="flex flex-col border-t border-ink/15 px-5 py-2 text-sm font-bold uppercase tracking-wider md:hidden">
          <Link href="/" className="min-h-12 border-b border-ink/10 py-3" onClick={close}>{copy.navigation.home}</Link>
          <Link href="/events" className="min-h-12 border-b border-ink/10 py-3" onClick={close}>{copy.navigation.events}</Link>

          {isAdmin ? (
            <>
              <span className="min-h-12 border-b border-ink/10 py-3 text-accent">Admin</span>
              <form action="/api/admin/logout" method="post"><button type="submit" className="min-h-12 w-full py-3 text-left">Sign out</button></form>
            </>
          ) : isLoggedIn ? (
            <>
              <Link href="/account" className="min-h-12 border-b border-ink/10 py-3" onClick={close}>{userName ?? "My account"}</Link>
              <Link href="/account/settings" className="min-h-12 border-b border-ink/10 py-3" onClick={close}>Settings</Link>
              <form action="/api/auth/logout" method="post"><button type="submit" className="min-h-12 w-full py-3 text-left">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="min-h-12 border-b border-ink/10 py-3" onClick={close}>Log in</Link>
              <Link href="/signup" className="min-h-12 py-3 text-accent" onClick={close}>Sign up</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
