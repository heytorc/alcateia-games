import { Switch as SwitchPrimitive } from "@/components/ui/switch";

export function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <SwitchPrimitive checked={checked} onCheckedChange={onChange} />;
}
