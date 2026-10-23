import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputOTPProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maxLength?: number
  onComplete?: (value: string) => void
}

export const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  ({ className, maxLength = 4, onComplete, onChange, value: controlledValue, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState("")
    const value = String(controlledValue ?? internalValue)
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, "").slice(0, maxLength)
      if (controlledValue === undefined) {
        setInternalValue(val)
      }
      if (onChange) {
        onChange(e)
      }
      if (val.length === maxLength && onComplete) {
        onComplete(val)
      }
    }

    const [focused, setFocused] = React.useState(false)
    const active = Math.min(value.length, maxLength - 1)

    return (
      <div className="relative flex items-center justify-center gap-2" onClick={() => inputRef.current?.focus()}>
        <input
          {...props}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          autoFocus
          aria-label="Código da sala"
          value={value}
          onChange={handleChange}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
          className={cn("absolute inset-0 z-10 h-full w-full cursor-text opacity-0", className)}
        />
        <div className="flex gap-2">
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "grid h-[60px] w-[52px] place-items-center rounded-md border-2 border-[#3a2a80] bg-card font-game-pixel text-[26px] font-bold text-white transition-all max-[480px]:h-[54px] max-[480px]:w-[44px] max-[480px]:text-[22px]",
                value[i] && "border-[#6b3cff] shadow-[0_0_12px_rgba(107,60,255,.45)]",
                focused && i === active && "outline-3 outline-offset-2 outline-ring"
              )}
            >
              {value[i] || (focused && i === active ? <span className="blink">_</span> : "")}
            </div>
          ))}
        </div>
      </div>
    )
  }
)
InputOTP.displayName = "InputOTP"
