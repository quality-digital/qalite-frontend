import type { Environment } from '../../../domain/entities/Environment';
import type { EnvironmentBug } from '../../../domain/entities/EnvironmentBug';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { Button } from '../Button';
import { useToast } from '../../context/ToastContext';

const BUG_STATUS_LABEL: Record<EnvironmentBug['status'], string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};

interface EnvironmentBugListProps {
  environment: Environment;
  bugs: EnvironmentBug[];
  isLocked?: boolean;
  isLoading?: boolean;
  onCreate: () => void;
  onEdit: (bug: EnvironmentBug) => void;
  showActions?: boolean;
}

export const EnvironmentBugList = ({
  environment,
  bugs,
  isLocked,
  isLoading,
  onCreate,
  onEdit,
  showActions = true,
}: EnvironmentBugListProps) => {
  const { showToast } = useToast();
  const isReadOnly = Boolean(isLocked);

  const handleDelete = async (bug: EnvironmentBug) => {
    if (isReadOnly) {
      return;
    }

    const shouldDelete = window.confirm('Deseja realmente remover este bug?');
    if (!shouldDelete) {
      return;
    }

    try {
      await environmentService.deleteBug(environment.id, bug.id);
      showToast({ type: 'success', message: 'Bug removido com sucesso.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível remover o bug.' });
    }
  };

  const getScenarioLabel = (scenarioId: string | null) => {
    if (!scenarioId) {
      return 'Não vinculado';
    }

    return environment.scenarios?.[scenarioId]?.titulo ?? 'Cenário removido';
  };

  return (
    <div className="environment-bugs">
      <div className="environment-bugs__header">
        <h3 className="section-title">Registro de bugs</h3>
        {showActions && (
          <Button type="button" onClick={onCreate} disabled={isReadOnly}>
            Registrar bug
          </Button>
        )}
      </div>
      {isLoading ? (
        <p className="section-subtitle">Carregando bugs...</p>
      ) : bugs.length === 0 ? (
        <p className="section-subtitle">Nenhum bug registrado neste ambiente.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Cenário</th>
              <th>Descrição</th>
              {showActions && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {bugs.map((bug) => (
              <tr key={bug.id}>
                <td>{bug.title}</td>
                <td>
                  <span className={`bug-status bug-status--${bug.status}`}>
                    {BUG_STATUS_LABEL[bug.status]}
                  </span>
                </td>
                <td>{getScenarioLabel(bug.scenarioId)}</td>
                <td>{bug.description || 'Sem descrição'}</td>
                {showActions && (
                  <td className="environment-bugs__actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => onEdit(bug)}
                      disabled={isReadOnly}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="link-button link-button--danger"
                      onClick={() => handleDelete(bug)}
                      disabled={isReadOnly}
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
