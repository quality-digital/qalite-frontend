import { useTranslation } from 'react-i18next';

import { Button } from './Button';

interface PaginationControlsProps {
  total: number;
  visible: number;
  step: number;
  onShowLess: () => void;
  onShowMore: () => void;
}

export const PaginationControls = ({
  total,
  visible,
  step,
  onShowLess,
  onShowMore,
}: PaginationControlsProps) => {
  const { t } = useTranslation();

  if (total <= step) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <span className="pagination-controls__summary">
        {t('pagination.showing', { visible, total })}
      </span>
      <div className="pagination-controls__actions">
        <Button type="button" variant="ghost" onClick={onShowLess} disabled={visible <= step}>
          {t('pagination.showLess')}
        </Button>
        <Button type="button" variant="secondary" onClick={onShowMore} disabled={visible >= total}>
          {t('pagination.showMore')}
        </Button>
      </div>
    </div>
  );
};
