import { Button } from "@/components/ui/button";
import { gameButtonVariants } from "@/components/games/GameButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const iconButtonClass = gameButtonVariants({ variant: "special", size: "icon" });

export function IconButton({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className={iconButtonClass} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
