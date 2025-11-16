import { EnvironmentBoard } from '../components/EnvironmentBoard';
import { Layout } from '../components/Layout';
import type { StoreSuite } from '../../domain/entities/Store';

const demoSuites: StoreSuite[] = [
  {
    id: 'suite-smoke',
    name: 'Smoke Checkout',
    description: 'Fluxo crítico do checkout em produção controlada',
    scenarioIds: [],
  },
  {
    id: 'suite-progressivo',
    name: 'Progressivo Mobile',
    description: 'Validação do app e PWA nos principais devices',
    scenarioIds: [],
  },
  {
    id: 'suite-performance',
    name: 'Performance & SEO',
    description: 'Auditoria Lighthouse e Core Web Vitals',
    scenarioIds: [],
  },
];

const statusLabels = {
  running: 'Em andamento',
  ready: 'Disponível',
  blocked: 'Bloqueado',
} as const;

type EnvironmentRowStatus = keyof typeof statusLabels;

interface EnvironmentRow {
  id: string;
  name: string;
  description: string;
  type: 'WS' | 'TM' | 'PROD';
  status: EnvironmentRowStatus;
  owner: string;
  executions: string;
  lastUpdate: string;
  link: string;
}

const environmentTableRows: EnvironmentRow[] = [
  {
    id: 'env-ws-smoke',
    name: 'Workspace Smoke Test',
    description: 'Validação rápida pré-merge',
    type: 'WS',
    status: 'running',
    owner: 'Squad Checkout',
    executions: '12/20 cenários',
    lastUpdate: 'Atualizado há 8 minutos',
    link: 'https://example.com/env/workspace-smoke',
  },
  {
    id: 'env-tm-regressivo',
    name: 'T.M. Regressivo',
    description: 'Fluxos críticos de integração',
    type: 'TM',
    status: 'ready',
    owner: 'Tribo Comercial',
    executions: '24/24 cenários',
    lastUpdate: 'Atualizado hoje às 09:20',
    link: 'https://example.com/env/tm-regressivo',
  },
  {
    id: 'env-prod-monitoracao',
    name: 'Prod Monitoramento',
    description: 'Smoke pós-deploy em produção',
    type: 'PROD',
    status: 'blocked',
    owner: 'SRE + QA',
    executions: '6/10 verificações',
    lastUpdate: 'Atualizado ontem às 23:45',
    link: 'https://example.com/env/prod-monitoracao',
  },
];

export const EnvironmentPage = () => (
  <Layout>
    <div className="environment-page">
      <section className="environment-hero">
        <div>
          <p className="environment-badge">Hub de ambientes</p>
          <h1>Ambientes prontos para seus testes</h1>
          <p className="environment-hero__description">
            Acompanhe o status de execução, encontre links úteis e visualize o progresso dos testes
            em um único lugar.
          </p>
        </div>
        <ul className="environment-hero__meta">
          <li>
            <span className="environment-hero__meta-label">Ambientes ativos</span>
            <strong>03</strong>
          </li>
          <li>
            <span className="environment-hero__meta-label">Execuções em andamento</span>
            <strong>1</strong>
          </li>
          <li>
            <span className="environment-hero__meta-label">Última atualização</span>
            <strong>há poucos minutos</strong>
          </li>
        </ul>
      </section>

      <section className="environment-section">
        <div className="environment-section__header">
          <div>
            <p className="environment-section__eyebrow">Kanban dos ambientes</p>
            <h2>Fluxo de execução</h2>
            <p className="environment-section__subtitle">
              Organize execuções por status, acompanhe responsáveis e abra rapidamente o acesso de
              cada ambiente.
            </p>
          </div>
          <span className="environment-pill">Interativo</span>
        </div>
        <EnvironmentBoard storeName="Ambiente QA" suites={demoSuites} />
      </section>

      <section className="environment-section">
        <div className="environment-section__header">
          <div>
            <p className="environment-section__eyebrow">Ambientes para testes</p>
            <h2>Tabela de referência</h2>
            <p className="environment-section__subtitle">
              Consulte rapidamente quem está utilizando cada ambiente, o tipo de execução e o link
              de acesso.
            </p>
          </div>
          <span className="environment-pill">Atualização manual</span>
        </div>

        <div className="environment-table__wrapper">
          <table className="environment-table">
            <thead>
              <tr>
                <th>Ambiente</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Execuções</th>
                <th>Última atualização</th>
                <th>Acesso</th>
              </tr>
            </thead>
            <tbody>
              {environmentTableRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="environment-table__title">
                      <strong>{row.name}</strong>
                      <span>{row.description}</span>
                    </div>
                  </td>
                  <td>
                    <span className="environment-type">{row.type}</span>
                  </td>
                  <td>
                    <span
                      className={`environment-table__status environment-table__status--${row.status}`}
                    >
                      {statusLabels[row.status]}
                    </span>
                  </td>
                  <td>{row.owner}</td>
                  <td>{row.executions}</td>
                  <td>{row.lastUpdate}</td>
                  <td>
                    <a
                      className="environment-link"
                      href={row.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </Layout>
);
