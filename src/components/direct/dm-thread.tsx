"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Trash2, Pencil, MoreVertical, ArrowLeft, Ban, Flag, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatRelative } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  sendDirectMessage,
  editDirectMessage,
  deleteDirectMessage,
  markConversationRead,
  blockUser,
  unblockUser,
  reportConversation,
} from "@/server/actions/direct-messages";
import type { DMMessage, DMMemberOption } from "@/server/queries/direct-messages";
import { toast } from "sonner";

// Linha crua entregue pelo realtime (postgres_changes) — sem join.
type RawMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
};

export function DMThread({
  conversationId,
  currentUserId,
  other,
  iBlocked,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  other: DMMemberOption | null;
  iBlocked: boolean;
  initialMessages: DMMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<DMMessage[]>(initialMessages);
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [blocked, setBlocked] = React.useState(iBlocked);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const [supabase] = React.useState(() => createClient());

  // Realtime da conversa (INSERT + UPDATE), filtrado por conversation_id.
  React.useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as RawMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: m.id,
                    sender_id: m.sender_id,
                    body: m.body,
                    is_deleted: m.is_deleted,
                    edited_at: m.edited_at,
                    created_at: m.created_at,
                  },
                ],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as RawMessage;
          setMessages((prev) =>
            prev.map((x) =>
              x.id === m.id ? { ...x, body: m.body, is_deleted: m.is_deleted, edited_at: m.edited_at } : x,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  // Marca como lida ao abrir e ao sair (cleanup) — cobre mensagens recebidas
  // enquanto a conversa está aberta, sem escrever a cada mensagem nova.
  React.useEffect(() => {
    void markConversationRead(conversationId);
    return () => {
      void markConversationRead(conversationId);
    };
  }, [conversationId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    startTransition(async () => {
      const res = await sendDirectMessage(conversationId, text);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao enviar.");
        setBody(text);
      }
    });
  }

  function saveEdit(id: string) {
    const text = editingText.trim();
    if (!text) return;
    setEditingId(null);
    startTransition(async () => {
      const res = await editDirectMessage(id, text);
      if (!res.ok) toast.error(res.error ?? "Erro ao editar.");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteDirectMessage(id);
      if (!res.ok) toast.error(res.error ?? "Erro ao remover.");
    });
  }

  function toggleBlock() {
    if (!other) return;
    startTransition(async () => {
      const res = blocked ? await unblockUser(other.id) : await blockUser(other.id);
      if (!res.ok) {
        toast.error(res.error ?? "Erro.");
        return;
      }
      setBlocked(!blocked);
      toast.success(blocked ? "Usuário desbloqueado." : "Usuário bloqueado.");
      router.refresh();
    });
  }

  function submitReport() {
    const reason = reportReason.trim();
    startTransition(async () => {
      const res = await reportConversation(conversationId, reason);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao denunciar.");
        return;
      }
      setReportOpen(false);
      setReportReason("");
      toast.success("Denúncia enviada. Nossa equipe vai analisar.");
    });
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-3 border-b p-3">
        <Link
          href="/mensagens"
          className="text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <UserAvatar name={other?.full_name} src={other?.avatar_url} className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{other?.full_name ?? "Membro"}</p>
          {other?.username ? <p className="truncate text-xs text-muted-foreground">@{other.username}</p> : null}
        </div>
        {other ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Opções">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleBlock}>
                {blocked ? (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Desbloquear
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" /> Bloquear
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="mr-2 h-4 w-4" /> Denunciar conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Diga olá!</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine ? (
                  <UserAvatar name={other?.full_name} src={other?.avatar_url} className="h-7 w-7 shrink-0" />
                ) : null}
                <div className={cn("max-w-[75%]", mine ? "items-end" : "items-start")}>
                  {editingId === m.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        maxLength={2000}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit(m.id);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(m.id)}
                        disabled={pending || !editingText.trim()}
                      >
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        mine ? "bg-[var(--accent)] text-white" : "bg-muted",
                      )}
                    >
                      {m.is_deleted ? (
                        <span className="italic opacity-80">mensagem removida</span>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{m.body}</span>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "mt-0.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground",
                      mine ? "justify-end" : "justify-start",
                    )}
                  >
                    <span>{formatRelative(m.created_at)}</span>
                    {m.edited_at && !m.is_deleted ? <span>(editada)</span> : null}
                    {mine && !m.is_deleted && editingId !== m.id ? (
                      <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditingText(m.body);
                          }}
                          disabled={pending}
                          aria-label="Editar"
                          className="hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m.id)}
                          disabled={pending}
                          aria-label="Remover"
                          className="hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <div className="border-t p-3 text-center text-sm text-muted-foreground">
          Você bloqueou este usuário.{" "}
          <button
            type="button"
            onClick={toggleBlock}
            disabled={pending}
            className="font-medium text-foreground underline"
          >
            Desbloquear
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex items-center gap-2 border-t p-3">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva uma mensagem…"
            maxLength={2000}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={pending || !body.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar conversa</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Descreva o motivo (mín. 3 caracteres)…"
            maxLength={500}
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitReport}
              disabled={pending || reportReason.trim().length < 3}
            >
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
