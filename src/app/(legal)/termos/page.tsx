import { COMPANY } from "@/lib/config/company";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p>Última atualização: 4 de julho de 2026.</p>

      <h2>1. Aceitação</h2>
      <p>
        Ao criar uma conta e usar a plataforma Portal Nexus (&quot;Plataforma&quot;), operada por
        {" "}
        {COMPANY.legalName}, {COMPANY.taxIdLabel} {COMPANY.taxId} (&quot;nós&quot;), você concorda
        com estes Termos. Se não concordar, não utilize a Plataforma.
      </p>

      <h2>2. Conta e elegibilidade</h2>
      <p>
        Você é responsável por manter a confidencialidade das suas credenciais e por todas as
        atividades realizadas na sua conta. Informações de cadastro devem ser verdadeiras e
        atualizadas.
      </p>

      <h2>3. Conduta</h2>
      <p>
        É proibido publicar conteúdo ilegal, ofensivo, que viole direitos de terceiros, contenha
        malware ou spam. Podemos remover conteúdo e suspender contas que violem estas regras.
      </p>

      <h2>4. Conteúdo</h2>
      <p>
        Você mantém a titularidade do conteúdo que publica, concedendo-nos licença para exibi-lo na
        Plataforma. O conteúdo dos cursos e materiais é protegido por direitos autorais e não pode
        ser redistribuído sem autorização.
      </p>

      <h2>5. Pagamentos</h2>
      <p>
        Caso existam planos pagos, as condições de cobrança, renovação e cancelamento serão
        informadas no momento da contratação.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        A Plataforma é fornecida &quot;no estado em que se encontra&quot;. Não nos responsabilizamos
        por danos indiretos decorrentes do uso, na máxima extensão permitida por lei.
      </p>

      <h2>7. Alterações</h2>
      <p>
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas na Plataforma. O uso
        continuado após a alteração implica concordância.
      </p>

      <h2>8. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: {COMPANY.contactEmail}. Foro de {COMPANY.jurisdiction}, salvo
        disposição legal em contrário.
      </p>
    </>
  );
}
