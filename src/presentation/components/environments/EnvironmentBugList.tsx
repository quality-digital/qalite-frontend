import { useState } from 'react';

import type { Environment } from '../../../domain/entities/environment';
import type { EnvironmentBug } from '../../../domain/entities/environment';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { useToast } from '../../context/ToastContext';
import { BUG_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface EnvironmentBugListProps {
  environment: Environment;
  bugs: EnvironmentBug[];
  isLocked?: boolean;
  isLoading?: boolean;
  onEdit: (bug: EnvironmentBug) => void;
  showActions?: boolean;
}

export const EnvironmentBugList = ({
  environment,
  bugs,
  isLocked,
  isLoading,
  onEdit,
  showActions = true,
}: EnvironmentBugListProps) => {
  const { showToast } = useToast();
  const isReadOnly = Boolean(isLocked);
  const [bugToDelete, setBugToDelete] = useState<EnvironmentBug | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDelete = async (bug: EnvironmentBug) => {
    if (isReadOnly) {
      return;
    }

    try {
      setIsConfirmingDelete(true);
      await environmentService.deleteBug(environment.id, bug.id);
      showToast({ type: 'success', message: 'Bug removido com sucesso.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível remover o bug.' });
    } finally {
      setIsConfirmingDelete(false);
      setBugToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!bugToDelete) {
      return;
    }

    await handleDelete(bugToDelete);
  };

  const closeDeleteModal = () => {
    if (isConfirmingDelete) {
      return;
    }

    setBugToDelete(null);
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
                      onClick={() => setBugToDelete(bug)}
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
      <ConfirmDeleteModal
        isOpen={Boolean(bugToDelete)}
        message={
          bugToDelete
            ? `Você deseja mesmo excluir o bug "${bugToDelete.title}"?`
            : 'Você deseja mesmo excluir?'
        }
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </div>
  );
};
