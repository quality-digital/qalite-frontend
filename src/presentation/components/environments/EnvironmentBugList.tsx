import { useState } from 'react';

import type { Environment } from '../../../domain/entities/environment';
import type { EnvironmentBug } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { environmentService } from '../../../infrastructure/services/environmentService';
import { useToast } from '../../context/ToastContext';
import { BUG_PRIORITY_LABEL, BUG_SEVERITY_LABEL } from '../../../shared/config/environmentLabels';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useTranslation } from 'react-i18next';
import { EyeIcon, PencilIcon, TrashIcon } from '../icons';
import { EnvironmentBugDetailsModal } from './EnvironmentBugDetailsModal';

interface EnvironmentBugListProps {
  environment: Environment;
  bugs: EnvironmentBug[];
  participants?: UserSummary[];
  isLocked?: boolean;
  isLoading?: boolean;
  onEdit: (bug: EnvironmentBug) => void;
  onRefresh?: () => void;
  showActions?: boolean;
  showHeader?: boolean;
}

export const EnvironmentBugList = ({
  environment,
  bugs,
  participants,
  isLocked,
  isLoading,
  onEdit,
  onRefresh,
  showActions = true,
  showHeader = true,
}: EnvironmentBugListProps) => {
  const { showToast } = useToast();
  const { t: translation } = useTranslation();

  const isReadOnly = Boolean(isLocked);
  const [bugToDelete, setBugToDelete] = useState<EnvironmentBug | null>(null);
  const [bugToView, setBugToView] = useState<EnvironmentBug | null>(null);
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
      onRefresh?.();
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

  const getSeverityLabel = (severity: EnvironmentBug['severity']) => {
    if (!severity) {
      return translation('environmentBugList.noSeverity');
    }

    return translation(BUG_SEVERITY_LABEL[severity]);
  };

  const getPriorityLabel = (priority: EnvironmentBug['priority']) => {
    if (!priority) {
      return translation('environmentBugList.noPriority');
    }

    return translation(BUG_PRIORITY_LABEL[priority]);
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
        <div className="table-scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th className="scenario-title-column">{translation('environmentBugList.scenario')}</th>
                <th>{translation('environmentBugList.severity')}</th>
                <th>{translation('environmentBugList.priority')}</th>
                <th>{translation('environmentBugList.actualResult')}</th>
                {showActions && <th>{translation('environmentBugList.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {bugs.map((bug) => (
                <tr key={bug.id}>
                  <td
                    className="scenario-title-cell"
                    title={getScenarioLabel(bug.scenarioId)}
                  >
                    <span className="scenario-title-text">
                      {getScenarioLabel(bug.scenarioId)}
                    </span>
                  </td>
                  <td>
                    <span className={`bug-severity bug-severity--${bug.severity ?? 'unknown'}`}>
                      {getSeverityLabel(bug.severity)}
                    </span>
                  </td>
                  <td>
                    <span className={`bug-priority bug-priority--${bug.priority ?? 'unknown'}`}>
                      {getPriorityLabel(bug.priority)}
                    </span>
                  </td>
                  <td>
                    {bug.actualResult?.trim() || translation('environmentBugList.noActualResult')}
                  </td>
                  {showActions && (
                    <td className="environment-bugs__actions">
                      <div className="environment-bugs__actions-content">
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => setBugToView(bug)}
                          aria-label={translation('environmentBugList.viewDetails')}
                          title={translation('environmentBugList.viewDetails')}
                        >
                          <EyeIcon aria-hidden className="action-button__icon" />
                          {translation('environmentBugList.viewDetails')}
                        </button>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => onEdit(bug)}
                          disabled={isReadOnly}
                          aria-label={translation('environmentBugList.edit')}
                          title={translation('environmentBugList.edit')}
                        >
                          <PencilIcon aria-hidden className="action-button__icon" />
                        </button>
                        <button
                          type="button"
                          className="action-button action-button--danger"
                          onClick={() => setBugToDelete(bug)}
                          disabled={isReadOnly}
                          aria-label={translation('environmentBugList.remove')}
                          title={translation('environmentBugList.remove')}
                        >
                          <TrashIcon aria-hidden className="action-button__icon" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      <EnvironmentBugDetailsModal
        isOpen={Boolean(bugToView)}
        bug={bugToView}
        environment={environment}
        participants={participants}
        onClose={() => setBugToView(null)}
      />
    </div>
  );
};
