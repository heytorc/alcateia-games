export function RoomPin({ pin }: { pin: string }) {
  return (
    <div className="flex flex-col items-center gap-2" aria-label={`Sala ${pin}`}>
      <span className="font-game-pixel text-[10px] tracking-[.2em] text-brand-accent">PIN DA SALA</span>
      <div className="flex gap-2">
        {pin.split("").map((digit, i) => (
          <span
            key={i}
            className="grid h-[60px] w-[52px] place-items-center rounded-md border-2 border-[#6b3cff] bg-card font-game-pixel text-[26px] font-bold text-white shadow-[0_0_12px_rgba(107,60,255,.45)] max-[480px]:h-[54px] max-[480px]:w-[44px] max-[480px]:text-[22px]">
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
}
