import { useEffect, useState } from "react";

export function Countdown({ seconds, onDone }: { seconds: number; onDone?: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const timer = window.setInterval(() => setRemaining((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);
  useEffect(() => {
    if (remaining === 0) onDone?.();
  }, [remaining, onDone]);
  return (
    <div className="flex flex-col items-center text-[#fdcb6e]">
      <span className="font-game-pixel text-[42px] leading-none font-bold">{remaining}</span>
      <small className="mt-1 text-[10px] font-extrabold tracking-[.14em] text-[#a7a4b8]">segundos</small>
    </div>
  );
}
