/**
 * Layout do segmento /apps com slot paralelo @modal — o modal interceptado
 * (.)[slug] renderiza por cima do grid (soft-nav) com URL /apps/[slug]
 * compartilhavel. Hard-nav/refresh cai na pagina publica real.
 */
export default function AppsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
