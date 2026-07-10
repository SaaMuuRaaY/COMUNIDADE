"use client";

import * as React from "react";

/**
 * Estado do drawer de navegação (mobile), elevado do Header para que o tour guiado
 * possa abri-lo antes de destacar um item. Sem isso o tour não teria como alcançar
 * o menu no mobile (o `Sheet` só monta o conteúdo quando aberto).
 *
 * Escopo mínimo: um booleano. Não é um "provider global de onboarding".
 */
type NavDrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const NavDrawerContext = React.createContext<NavDrawerContextValue | null>(null);

export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  return <NavDrawerContext.Provider value={value}>{children}</NavDrawerContext.Provider>;
}

export function useNavDrawer(): NavDrawerContextValue {
  const ctx = React.useContext(NavDrawerContext);
  if (!ctx) throw new Error("useNavDrawer precisa estar dentro de <NavDrawerProvider>.");
  return ctx;
}
