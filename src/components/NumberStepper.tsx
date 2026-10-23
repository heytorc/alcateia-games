import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

export function NumberStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  onBlur,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
}: {
  value: number | string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  ariaLabel: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  const numericValue = Number(value);
  const hasNumericValue = Number.isFinite(numericValue);
  const updateBy = (amount: number) => {
    const current = hasNumericValue ? numericValue : min;
    onChange(String(Math.min(max, Math.max(min, current + amount))));
  };
  return (
    <div className="inline-grid grid-cols-[34px_minmax(72px,110px)_34px] items-stretch">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-auto rounded-r-none border-2 border-[#4a34a8] bg-panel-base text-white/90 hover:bg-panel-hover hover:text-white disabled:text-muted-foreground"
        onClick={() => updateBy(-step)}
        disabled={!hasNumericValue || numericValue <= min}
        aria-label={`Diminuir ${ariaLabel}`}>
        <Minus size={16} />
      </Button>
      <Input
        className="h-auto min-w-0 rounded-none border-x-0 border-white/15 bg-panel-dark px-[10px] py-[9px] text-center text-white"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-auto rounded-l-none border-2 border-[#4a34a8] bg-panel-base text-white/90 hover:bg-panel-hover hover:text-white disabled:text-muted-foreground"
        onClick={() => updateBy(step)}
        disabled={!hasNumericValue || numericValue >= max}
        aria-label={`Aumentar ${ariaLabel}`}>
        <Plus size={16} />
      </Button>
    </div>
  );
}
