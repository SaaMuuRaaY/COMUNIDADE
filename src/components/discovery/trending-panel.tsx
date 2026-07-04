import Link from "next/link";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrendingPosts } from "@/server/queries/trending";

/**
 * Painel "Publicacoes em Alta" (Feature C F3). Item compacto (titulo + autor +
 * interacoes), NAO reusa o PostCard pesado. Cacheado no getTrendingPosts (120s).
 */
export async function TrendingPanel({ limit = 5 }: { limit?: number }) {
  const posts = await getTrendingPosts(limit);
  if (posts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Flame className="h-4 w-4 text-[var(--accent)]" />
        <CardTitle className="text-base">Publicações em alta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/post/${p.id}`}
            className="block rounded-md p-2 transition-colors hover:bg-accent"
          >
            <p className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {p.author_name ?? "Membro"}
              {p.interactions > 0 ? ` · ${p.interactions} interações` : ""}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
