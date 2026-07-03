"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PenSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { toast } from "sonner";
import { searchMembers, startConversation } from "@/server/actions/direct-messages";
import type { DMMemberOption } from "@/server/queries/direct-messages";

// Seletor "nova conversa": busca membros (debounce) e abre/reusa a conversa 1:1.
export function NewConversation() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [members, setMembers] = React.useState<DMMemberOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchMembers(query);
      if (active) {
        setMembers(res);
        setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, query]);

  function pick(userId: string) {
    startTransition(async () => {
      const res = await startConversation(userId);
      if (!res.ok || !res.conversationId) {
        toast.error(res.error ?? "Erro ao abrir conversa.");
        return;
      }
      setOpen(false);
      router.push(`/mensagens/${res.conversationId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <PenSquare className="h-4 w-4" /> Nova conversa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar membro…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando…</p>
          ) : members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro encontrado.</p>
          ) : (
            members.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={pending}
                onClick={() => pick(m.id)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent disabled:opacity-50"
              >
                <UserAvatar name={m.full_name} src={m.avatar_url} className="h-8 w-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.full_name ?? "Membro"}</p>
                  {m.username ? (
                    <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
