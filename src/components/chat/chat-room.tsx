"use client";

import * as React from "react";
import { Send, Trash2, Pencil } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelative } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction, deleteMessageAction, editMessageAction } from "@/server/actions/chat";
import type { ChatMessage } from "@/server/queries/chat";
import { toast } from "sonner";

// Linha crua entregue pelo realtime (postgres_changes) — sem join.
type RawMessage = {
  id: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
  edited_at: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
};

const ROOM = "community";

/**
 * Chat em tempo real (estilo chatroom) — FEATURE 02. Renderizado dentro da rota
 * Chat Network (/chat-e-networking). Histórico vem do server (initialMessages);
 * as novas chegam via Supabase Realtime (INSERT) e o soft-delete via UPDATE.
 */
export function ChatRoom({
  initialMessages,
  currentUserId,
  canModerate,
}: {
  initialMessages: ChatMessage[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  // Client criado UMA vez — evita instância/websocket órfã em re-render/StrictMode.
  const [supabase] = React.useState(() => createClient());

  React.useEffect(() => {
    const channel = supabase
      .channel("chat:community")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room=eq.${ROOM}` },
        (payload) => {
          const m = payload.new as RawMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: m.id,
                    body: m.body,
                    created_at: m.created_at,
                    is_deleted: m.is_deleted,
                    edited_at: m.edited_at,
                    author_id: m.author_id,
                    author_name: m.author_name,
                    author_avatar: m.author_avatar,
                  },
                ],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `room=eq.${ROOM}` },
        (payload) => {
          const m = payload.new as RawMessage;
          setMessages((prev) =>
            prev.map((x) =>
              x.id === m.id
                ? { ...x, is_deleted: m.is_deleted, body: m.body, edited_at: m.edited_at }
                : x,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("body", text);
      const res = await sendMessageAction(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao enviar.");
        setBody(text);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteMessageAction(id);
      if (!res.ok) toast.error(res.error ?? "Erro ao remover.");
    });
  }

  function saveEdit(id: string) {
    const text = editingText.trim();
    if (!text) return;
    setEditingId(null);
    startTransition(async () => {
      const res = await editMessageAction(id, text);
      if (!res.ok) toast.error(res.error ?? "Erro ao editar.");
    });
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda. Comece a conversa!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === currentUserId;
            return (
              <div key={m.id} className="group flex items-start gap-2.5">
                <UserAvatar name={m.author_name} src={m.author_avatar} className="h-8 w-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{m.author_name ?? "Membro"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(m.created_at)}
                    </span>
                    {m.edited_at && !m.is_deleted ? (
                      <span className="text-xs text-muted-foreground">(editada)</span>
                    ) : null}
                  </div>
                  {m.is_deleted ? (
                    <p className="text-sm italic text-muted-foreground">mensagem removida</p>
                  ) : editingId === m.id ? (
                    <div className="mt-1 flex items-center gap-2">
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
                        className="h-8 flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(m.id)}
                        disabled={pending || !editingText.trim()}
                      >
                        Salvar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  )}
                </div>
                {!m.is_deleted && editingId !== m.id && (mine || canModerate) ? (
                  <div className="mt-0.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(m.id);
                          setEditingText(m.body);
                        }}
                        disabled={pending}
                        aria-label="Editar mensagem"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      disabled={pending}
                      aria-label="Remover mensagem"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

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
    </div>
  );
}
