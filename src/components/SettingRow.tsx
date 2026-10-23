import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Label className="min-h-16 justify-between border-t border-white/9 py-[14px] text-white">
      <span className="flex flex-col gap-[3px]">
        <strong>{label}</strong>
        {description && <small className="text-xs font-normal text-[#9b97b2]">{description}</small>}
      </span>
      {children}
    </Label>
  );
}
