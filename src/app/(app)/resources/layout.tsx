/**
 * Layout do segmento /resources com slot paralelo @modal — permite o modal
 * interceptado (.)[slug] renderizar por cima do grid (soft-nav), com a URL
 * /resources/[slug] compartilhavel. Hard-nav/refresh cai na pagina publica real.
 */
export default function ResourcesLayout({
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
