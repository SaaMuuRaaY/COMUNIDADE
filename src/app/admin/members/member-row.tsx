"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setMemberRoleAction, setMemberBannedAction } from "@/server/actions/admin";
import { toast } from "sonner";

type Role = "admin" | "moderator" | "member";

export function MemberRow({ id, role, isBanned }: { id: string; role: Role; isBanned: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [currentRole, setRole] = React.useState<Role>(role);
  const [banned, setBanned] = React.useState(isBanned);

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

  function toggleBan() {
    startTransition(async () => {
      const res = await setMemberBannedAction(id, !banned);
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        setBanned(!banned);
        toast.success(!banned ? "Membro banido." : "Banimento removido.");
      }
    });
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
      <Button
        variant={banned ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={toggleBan}
      >
        {banned ? "Desbanir" : "Banir"}
      </Button>
    </div>
  );
}
