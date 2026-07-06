"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Casca do modal interceptado (rota (.)[slug]). Fica sempre `open`; fechar chama
 * router.back() pra voltar ao grid (soft-nav) mantendo a URL /[slug] compartilhavel.
 * O conteudo (LibraryItemContent) e injetado como children pela rota interceptada.
 */
export function ItemModal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) router.back();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Detalhe do item da Biblioteca</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
