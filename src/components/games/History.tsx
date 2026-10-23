export function History({ items, vertical = false }: { items: string[]; vertical?: boolean }) {
  return (
    <section className={`flex flex-col gap-2.5 px-0.5 py-3 ${vertical ? "grid grid-cols-[auto_1fr] items-start" : ""}`} aria-label="Itens sorteados">
      <span className="shrink-0 text-[10px] font-extrabold tracking-[.15em] text-[#85809d]">SORTEADOS</span>
      <div className={`grid w-full gap-2 ${vertical ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(78px,1fr))]"}`}>
        {items.length === 0 ? (
          <span className="col-span-full text-[13px] text-[#6d6980]">Nada por aqui ainda</span>
        ) : (
          items.map((item, index) => (
            <span className="grid min-h-[41px] min-w-0 place-items-center rounded-[6px] bg-[#1b1040] px-3 text-center font-extrabold whitespace-nowrap text-[#ebe8f5]" key={`${item}-${index}`}>
              {item}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
