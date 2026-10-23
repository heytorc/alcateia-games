import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-screen-xl px-5 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-10 text-center sm:flex-row">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-extrabold tracking-widest text-brand-accent uppercase">Alcateia Games</p>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} — Feito com 🐺 para a alcateia.
          </p>
        </div>

        <a
          href="https://github.com/heytorc/alcateia-games"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-bold text-white/60 transition-colors hover:text-white"
        >
          <Github size={18} />
          GitHub
        </a>
      </div>
    </footer>
  );
}
