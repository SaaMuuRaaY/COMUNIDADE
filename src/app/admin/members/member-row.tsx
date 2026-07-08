"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { setMemberRoleAction, setMemberBannedAction } from "@/server/actions/admin";
import { toast } from "sonner";

type Role = "admin" | "moderator" | "member";

export function MemberRow({
  id,
  role,
  isBanned,
  isOwner = false,
  canManage = true,
}: {
  id: string;
  role: Role;
  isBanned: boolean;
  isOwner?: boolean;
  canManage?: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [currentRole, setRole] = React.useState<Role>(role);
  const [banned, setBanned] = React.useState(isBanned);

  // Owner nunca expõe controles de role/ban — nem para o próprio owner logado.
  // (A proteção real está nas RPCs/RLS; aqui é só a UI.)
  if (isOwner) {
    return <span className="text-xs font-medium text-muted-foreground">Owner protegido</span>;
  }

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">Sem permissão</span>;
  }

  function changeRole(v: string) {
    const newRole = v as Role;
    setRole(newRole);
    startTransition(async () => {
      const res = await setMemberRoleAction(id, newRole);
      if (!res.ok) {
        toast.error(res.error ?? "Erro");
        setRole(role);
      } else toast.success("Papel atualizado.");
    });
  }

  async function doToggleBan() {
    const res = await setMemberBannedAction(id, !banned);
    if (!res.ok) toast.error(res.error ?? "Erro");
    else {
      setBanned(!banned);
      toast.success(!banned ? "Membro banido." : "Banimento removido.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentRole} onValueChange={changeRole}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="moderator">Moderador</SelectItem>
          <SelectItem value="member">Membro</SelectItem>
        </SelectContent>
      </Select>
      {banned ? (
        <Button
          variant="default"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(doToggleBan)}
        >
          Desbanir
        </Button>
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm" disabled={pending}>
              Banir
            </Button>
          }
          title="Banir membro?"
          description="O membro perde o acesso à comunidade até ser desbanido."
          confirmLabel="Banir"
          destructive
          onConfirm={doToggleBan}
        />
      )}
    </div>
  );
}
