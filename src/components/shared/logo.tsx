import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo do Portal Nexus. Wordmark em public/nexus-logo.png (306x87).
 * Use `className` para controlar a altura (ex.: "h-6"/"h-7"/"h-8"); a largura
 * acompanha (w-auto) mantendo o aspecto.
 */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/nexus-logo.png"
      alt="Nexus"
      width={306}
      height={87}
      priority={priority}
      className={cn("h-7 w-auto select-none", className)}
    />
  );
}
