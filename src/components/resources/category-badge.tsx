import { Badge } from "@/components/ui/badge";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function categoryLabel(value: string): string {
  return RESOURCE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function CategoryBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "border-transparent bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent)]",
        className,
      )}
    >
      {categoryLabel(category)}
    </Badge>
  );
}
