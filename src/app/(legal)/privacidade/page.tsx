import { COMPANY } from "@/lib/config/company";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p>Última atualização: 4 de julho de 2026.</p>
      <p>
        Esta Política descreve como {COMPANY.legalName}, {COMPANY.taxIdLabel} {COMPANY.taxId}, trata
        seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 — LGPD).
      </p>

      <h2>1. Dados que coletamos</h2>
      <p>
        Dados de cadastro (nome, e-mail), dados de uso (publicações, comentários, progresso em
        cursos, pontuação) e dados técnicos (cookies essenciais de sessão, endereço IP) necessários
        para autenticação e segurança.
      </p>

      <h2>2. Finalidade e base legal</h2>
      <p>
        Tratamos seus dados para operar a Plataforma (execução de contrato), garantir segurança
        (legítimo interesse) e cumprir obrigações legais. Não vendemos seus dados pessoais.
      </p>

      <h2>3. Compartilhamento</h2>
      <p>
        Utilizamos operadores que processam dados em nosso nome, como provedor de infraestrutura
        (Supabase) e e-mail transacional. Estes acessam os dados apenas para prestar o serviço.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos cookies essenciais para manter sua sessão autenticada. Eles são necessários ao
        funcionamento e não são usados para publicidade de terceiros.
      </p>

      <h2>5. Retenção</h2>
      <p>
        Mantemos os dados enquanto sua conta estiver ativa e pelo prazo necessário para cumprir
        obrigações legais. Você pode solicitar a exclusão a qualquer momento.
      </p>

      <h2>6. Seus direitos (LGPD)</h2>
      <p>
        Você pode solicitar acesso, correção, portabilidade, anonimização ou exclusão dos seus
        dados, além de revogar consentimento. Para exercer seus direitos, contate nosso encarregado
        (DPO): {COMPANY.dpoEmail}.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais (criptografia em trânsito, controle de acesso
        por papéis e Row-Level Security no banco) para proteger seus dados.
      </p>

      <h2>8. Contato</h2>
      <p>Dúvidas sobre privacidade: {COMPANY.contactEmail}.</p>
    </>
  );
}
