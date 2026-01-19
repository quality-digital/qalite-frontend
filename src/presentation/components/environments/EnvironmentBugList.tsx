import { useState } from 'react';

import type { Environment } from '../../../domain/entities/environment';
import type { EnvironmentBug } from '../../../domain/entities/environment';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { useToast } from '../../context/ToastContext';
import { BUG_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useTranslation } from 'react-i18next';

interface EnvironmentBugListProps {
  environment: Environment;
  bugs: EnvironmentBug[];
  isLocked?: boolean;
  isLoading?: boolean;
  onEdit: (bug: EnvironmentBug) => void;
  showActions?: boolean;
  showHeader?: boolean;
}

export const EnvironmentBugList = ({
  environment,
  bugs,
  isLocked,
  isLoading,
  onEdit,
  showActions = true,
  showHeader = true,
}: EnvironmentBugListProps) => {
  const { showToast } = useToast();
  const { t: translation } = useTranslation();

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
      showToast({
        type: 'success',
        message: translation('environmentBugList.bugRemovedSuccess'),
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        message: translation('environmentBugList.bugRemovedError'),
      });
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
      return translation('environmentBugList.notLinked');
    }

    return (
      environment.scenarios?.[scenarioId]?.titulo ||
      translation('environmentBugList.scenarioRemoved')
    );
  };

  if (!isLoading && bugs.length === 0) {
    return <p className="section-subtitle">{translation('environmentBugList.noBugs')}</p>;
  }

  return (
    <div className="environment-bugs">
      {showHeader && (
        <div className="environment-bugs__header">
          <h3 className="section-title">{translation('environmentBugList.bugRegistry')}</h3>
        </div>
      )}

      {isLoading ? (
        <p className="section-subtitle">{translation('environmentBugList.loadingBugs')}</p>
      ) : bugs.length === 0 ? (
        <p className="section-subtitle">{translation('environmentBugList.noBugs')}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{translation('environmentBugList.title')}</th>
              <th>{translation('environmentBugList.status')}</th>
              <th>{translation('environmentBugList.scenario')}</th>
              <th>{translation('environmentBugList.description')}</th>
              {showActions && <th>{translation('environmentBugList.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {bugs.map((bug) => (
              <tr key={bug.id}>
                <td>{bug.title}</td>
                <td>
                  <span className={`bug-status bug-status--${bug.status}`}>
                    {translation(BUG_STATUS_LABEL[bug.status])}
                  </span>
                </td>
                <td>{getScenarioLabel(bug.scenarioId)}</td>
                <td>{bug.description || translation('environmentBugList.noDescription')}</td>
                {showActions && (
                  <td className="environment-bugs__actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => onEdit(bug)}
                      disabled={isReadOnly}
                    >
                      {translation('environmentBugList.edit')}
                    </button>
                    <button
                      type="button"
                      className="link-button link-button--danger"
                      onClick={() => setBugToDelete(bug)}
                      disabled={isReadOnly}
                    >
                      {translation('environmentBugList.remove')}
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
            ? translation('environmentBugList.confirmDeleteWithName', { title: bugToDelete.title })
            : translation('environmentBugList.confirmDelete')
        }
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </div>
  );
};
