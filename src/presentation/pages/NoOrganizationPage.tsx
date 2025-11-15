import { Layout } from '../components/Layout';

export const NoOrganizationPage = () => (
  <Layout>
    <section className="list-grid">
      <div className="card">
        <span className="badge">Configuração pendente</span>
        <h1 className="section-title">Você ainda não está vinculado a uma organização</h1>
        <p className="section-subtitle">
          Entre em contato com um administrador para ser adicionado a uma equipe e liberar os recursos do
          QaLite.
        </p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-primary">O que você pode fazer agora?</h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted">
          <li>Garanta que seus dados de perfil estejam atualizados em "Perfil".</li>
          <li>Confirme com o administrador responsável o e-mail da sua conta.</li>
          <li>Assim que for convidado, faça login novamente para acessar sua organização.</li>
        </ul>
      </div>
    </section>
  </Layout>
);
