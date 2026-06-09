import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cursos · Admin" };

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title, slug, status, order_index, created_at")
    .order("order_index");
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
        <Button asChild className="gap-2">
          <Link href="/admin/courses/new">
            <Plus className="h-4 w-4" /> Novo curso
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhum curso ainda"
          action={
            <Button asChild>
              <Link href="/admin/courses/new">Criar curso</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((c) => (
                <li key={c.id as string} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.title as string}</p>
                      <Badge variant={c.status === "published" ? "success" : "warning"}>
                        {c.status as string}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">/{c.slug as string}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link href={`/admin/courses/${c.id}/edit`}>
                        <Pencil className="h-3 w-3" /> Editar
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/courses/${c.id}`}>Ver</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Suprime warning ESLint sobre uso de Trash2 que pode aparecer noutro lugar
void Trash2;
