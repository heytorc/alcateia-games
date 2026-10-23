import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link
      to="/"
      aria-label="Voltar para Alcateia Games"
      className="grid grid-cols-[38px_auto] items-center gap-x-2 leading-[19px]">
      <img
        src={`${import.meta.env.BASE_URL}logo-wolf.svg`}
        alt=""
        width={35}
        height={40}
        draggable={false}
        className="row-span-2 h-10 w-[35px] shrink-0"
      />
      <strong className="font-game-pixel text-[16px] leading-[18px] font-bold tracking-[.04em] text-white [text-shadow:0_0_8px_var(--neon-pink)]">
        ALCATEIA
      </strong>
      <small className="font-game-pixel text-[8px] tracking-[.3em] text-brand-accent">GAMES</small>
    </Link>
  );
}
