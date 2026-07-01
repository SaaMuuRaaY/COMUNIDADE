export const metadata = { title: "Regras · Comunidade" };

export default function RegrasPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Regras da comunidade</h1>
        <p className="text-sm text-muted-foreground">
          Diretrizes para manter o Portal Nexus um espaço útil, seguro e respeitoso.
        </p>
      </div>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
        <li><strong>Respeito sempre.</strong> Nada de ofensas, discurso de ódio, assédio ou preconceito.</li>
        <li><strong>Publique no canal certo.</strong> Cada canal tem um propósito — leia a descrição antes de postar.</li>
        <li><strong>Sem spam.</strong> Evite autopromoção repetitiva, correntes e links não solicitados.</li>
        <li><strong>Conteúdo relevante.</strong> Mantenha as discussões dentro do tema da comunidade.</li>
        <li><strong>Sem pirataria nem conteúdo ilegal.</strong> Respeite direitos autorais e a lei.</li>
        <li><strong>Privacidade.</strong> Não compartilhe dados pessoais de terceiros sem consentimento.</li>
        <li><strong>Canais oficiais.</strong> Comunicados, Benefícios e Cupons são publicados apenas pela equipe.</li>
        <li><strong>Moderação.</strong> A equipe pode editar, mover, fixar ou remover conteúdo que viole estas regras.</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Dúvidas sobre as regras? Use o canal <strong>Dúvidas gerais</strong>.
      </p>
    </div>
  );
}
