import type { ReactNode } from "react";

type JoyShellProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Shared warm gradient frame + header strip for major app surfaces.
 */
export function JoyShell({ eyebrow, title, description, actions, children }: JoyShellProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50/70 to-fuchsia-100/60 text-zinc-900 dark:from-slate-950 dark:via-violet-950/40 dark:to-fuchsia-950/35 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl dark:bg-sky-500/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-500/10"
        aria-hidden
      />
      <header className="relative z-10 border-b border-white/60 bg-white/55 px-6 py-6 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/45">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-400 via-violet-500 to-rose-400" />
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600/90 dark:text-amber-300/90">
                {eyebrow}
              </p>
            ) : null}
            <div className={eyebrow ? "mt-1" : ""}>{title}</div>
            {description ? (
              <div className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

/** Gradient page title (same treatment as collect / home). */
export function joyTitleClassName() {
  return "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-sky-300 dark:via-fuchsia-300 dark:to-amber-200 sm:text-3xl";
}
