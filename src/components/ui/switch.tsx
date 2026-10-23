import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-[26px] w-[50px] shrink-0 cursor-pointer items-center rounded-md border-2 border-[#6b3cff] bg-muted transition-all outline-none after:absolute after:-inset-x-2 after:-inset-y-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-checked:bg-primary data-checked:shadow-[0_0_10px_var(--primary)] data-disabled:cursor-not-allowed data-disabled:opacity-50 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-sm bg-foreground ring-0 transition-transform data-checked:translate-x-[26px] data-unchecked:translate-x-[2px] motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
