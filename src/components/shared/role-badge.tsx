import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck } from "lucide-react";

export function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <Badge variant="default" className="gap-1">
        <Crown className="h-3 w-3" /> Admin
      </Badge>
    );
  }
  if (role === "moderator") {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheck className="h-3 w-3" /> Moderação
      </Badge>
    );
  }
  return null;
}
