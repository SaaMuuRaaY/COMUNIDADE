import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function LevelBadge({ level }: { level: number }) {
  return (
    <Badge variant="outline" className="gap-1 font-medium">
      <Sparkles className="h-3 w-3" />
      Nv {level}
    </Badge>
  );
}
