import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { EnvironmentStatus } from '../../domain/entities/Environment';
import {
  exportEnvironmentAsMarkdown,
  exportEnvironmentAsPDF,
  updateEnvironment,
} from '../../infra/firebase/environmentService';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useToast } from '../context/ToastContext';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { usePresentUsers } from '../hooks/usePresentUsers';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useAuth } from '../hooks/useAuth';
import { TabelaEvidencias } from '../components/environments/TabelaEvidencias';
import { ModalEditarAmbiente } from '../components/environments/ModalEditarAmbiente';
import { ModalExcluirAmbiente } from '../components/environments/ModalExcluirAmbiente';
import { useUserProfiles } from '../hooks/useUserProfiles';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const PaginaAmbiente = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isLocked = environment?.status === 'done';

  const { presentUsers } = usePresentUsers({
    environmentId: environment?.id ?? null,
    presentUsersIds: environment?.presentUsersIds ?? [],
    isLocked: Boolean(isLocked),
  });

  const participantProfiles = useUserProfiles(environment?.participants ?? []);

  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);

  const scenarioStats = useMemo(() => {
    if (!environment) {
      return { total: 0, concluded: 0, pending: 0, running: 0 };
    }

    const scenarios = Object.values(environment.scenarios ?? {});
    const concluded = scenarios.filter((scenario) =>
      ['concluido', 'concluido_automatizado', 'nao_se_aplica'].includes(scenario.status),
    ).length;
    const pending = scenarios.filter((scenario) => scenario.status === 'pendente').length;
    const running = scenarios.filter((scenario) => scenario.status === 'em_andamento').length;
    return { total: scenarios.length, concluded, pending, running };
  }, [environment]);

  const handleStatusTransition = async (target: EnvironmentStatus) => {
    if (!environment) {
      return;
    }

    if (target === 'done') {
      const hasPending = Object.values(environment.scenarios ?? {}).some(
        (scenario) => scenario.status === 'pendente',
      );

      if (hasPending) {
        showToast({
          type: 'error',
          message: 'Existem cenários pendentes. Conclua-os antes de finalizar.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    let timeTracking = environment.timeTracking;

    if (target === 'backlog') {
      timeTracking = { start: null, end: null, totalMs: 0 };
    } else if (target === 'in_progress') {
      timeTracking = { start: timeTracking.start ?? now, end: null, totalMs: timeTracking.totalMs };
    } else if (target === 'done') {
      const startTimestamp = timeTracking.start
        ? new Date(timeTracking.start).getTime()
        : Date.now();
      const totalMs = timeTracking.totalMs + Math.max(0, Date.now() - startTimestamp);
      const uniqueParticipants = Array.from(
        new Set([...(environment.participants ?? []), ...(environment.presentUsersIds ?? [])]),
      );
      timeTracking = { start: timeTracking.start ?? now, end: now, totalMs };

      try {
        await updateEnvironment(environment.id, {
          status: target,
          timeTracking,
          presentUsersIds: [],
          concludedBy: user?.uid ?? null,
          participants: uniqueParticipants,
        });
        showToast({ type: 'success', message: 'Ambiente concluído.' });
        return;
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível atualizar o status.' });
        return;
      }
    }

    try {
      await updateEnvironment(environment.id, { status: target, timeTracking });
      showToast({ type: 'success', message: 'Status atualizado com sucesso.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível atualizar o status.' });
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast({ type: 'success', message: 'Link copiado para a área de transferência.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível copiar o link.' });
    }
  };

  const handleExportPDF = () => {
    if (!environment) {
      return;
    }
    exportEnvironmentAsPDF(environment);
  };

  const handleExportMarkdown = () => {
    if (!environment) {
      return;
    }
    exportEnvironmentAsMarkdown(environment);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const privateLink = environment ? `${origin}/environments/${environment.id}` : '';
  const publicLink = environment ? `${origin}/environments/${environment.id}/public` : '';

  return (
    <Layout>
      <section className="page-container environment-page">
        <div className="environment-page__header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Voltar
            </button>
            <div className="environment-page__title">
              {environment && (
                <span className={`status-pill status-pill--${environment.status}`}>
                  {STATUS_LABEL[environment.status]}
                </span>
              )}
              <h1 className="section-title">{environment?.identificador ?? 'Ambiente'}</h1>
              {environment && (
                <p className="section-subtitle">
                  {environment.tipoAmbiente} · {environment.tipoTeste}
                </p>
              )}
            </div>
          </div>
          {!isLoading && environment && (
            <div className="environment-actions">
              {environment.status === 'backlog' && (
                <Button type="button" onClick={() => handleStatusTransition('in_progress')}>
                  Iniciar execução
                </Button>
              )}
              {environment.status === 'in_progress' && (
                <Button type="button" onClick={() => handleStatusTransition('done')}>
                  Concluir ambiente
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(true)}>
                Editar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(true)}>
                Excluir
              </Button>
            </div>
          )}
        </div>

        {isLoading && <p className="section-subtitle">Carregando dados do ambiente...</p>}

        {!isLoading && environment && (
          <>
            <div className="environment-summary-grid">
              <div className="summary-card">
                <h3>Resumo do ambiente</h3>
                <div className="summary-card__metrics">
                  <div>
                    <span>Total de cenários</span>
                    <strong>{scenarioStats.total}</strong>
                  </div>
                  <div>
                    <span>Concluídos</span>
                    <strong>{scenarioStats.concluded}</strong>
                  </div>
                  <div>
                    <span>Em andamento</span>
                    <strong>{scenarioStats.running}</strong>
                  </div>
                  <div>
                    <span>Pendentes</span>
                    <strong>{scenarioStats.pending}</strong>
                  </div>
                </div>
                <p>
                  <strong>Tempo total:</strong> {formattedTime}
                </p>
                <p>
                  <strong>Jira:</strong> {environment.jiraTask || 'Não informado'}
                </p>
                <p>
                  <strong>Bugs:</strong> {environment.bugs}
                </p>
              </div>
              <div className="summary-card">
                <h3>URLs monitoradas</h3>
                {urls.length === 0 ? (
                  <p className="section-subtitle">Nenhuma URL adicionada.</p>
                ) : (
                  <ul className="environment-url-list">
                    {urls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="summary-card">
                <h3>Compartilhamento e exportação</h3>
                <div className="share-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleCopyLink(privateLink)}
                    disabled={isLocked}
                  >
                    Copiar link do ambiente
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleCopyLink(publicLink)}
                  >
                    Copiar link público
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleExportPDF}>
                    Exportar PDF
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleExportMarkdown}>
                    Exportar Markdown
                  </Button>
                </div>
                {isLocked && (
                  <p className="section-subtitle">
                    Ambiente concluído: compartilhamento bloqueado para novos acessos.
                  </p>
                )}
              </div>
            </div>

            <div className="environment-participants">
              <div>
                <h3>Usuários presentes</h3>
                {presentUsers.length === 0 ? (
                  <p className="section-subtitle">Nenhum usuário neste ambiente agora.</p>
                ) : (
                  <ul className="environment-present-users">
                    {presentUsers.map((user) => (
                      <li key={user.id}>
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} />
                        ) : (
                          <span className="environment-card-avatar environment-card-avatar--initials">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{user.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Participantes registrados</h3>
                {participantProfiles.length === 0 ? (
                  <p className="section-subtitle">Nenhum participante registrado ainda.</p>
                ) : (
                  <ul className="environment-present-users">
                    {participantProfiles.map((profile) => (
                      <li key={profile.id}>
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt={profile.name} />
                        ) : (
                          <span className="environment-card-avatar environment-card-avatar--initials">
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{profile.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="environment-evidence">
              <div className="environment-evidence__header">
                <div>
                  <h3 className="section-subtitle">Cenários e evidências</h3>
                  <p>Atualize o status e faça upload das evidências aprovadas.</p>
                </div>
                <a
                  href={`/environments/${environment.id}/public`}
                  className="link-button"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir preview público ↗
                </a>
              </div>
              <TabelaEvidencias environment={environment} isLocked={isLocked} />
            </div>
          </>
        )}
      </section>

      <ModalEditarAmbiente
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        environment={environment ?? null}
      />
      <ModalExcluirAmbiente
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        environment={environment ?? null}
        onDeleted={() => navigate(-1)}
      />
    </Layout>
  );
};
