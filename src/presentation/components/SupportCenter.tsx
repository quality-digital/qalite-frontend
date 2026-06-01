import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

const SUPPORT_SLACK_URL = 'https://qualitydigitalsa.slack.com/archives/C0B3U4CP5L2';
const SLACK_PNG_URL =
  'https://img.icons8.com/external-tal-revivo-color-tal-revivo/24/external-slack-replace-email-text-messaging-and-instant-messaging-for-your-team-logo-color-tal-revivo.png';

export const SupportCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        className="support-center-trigger"
        onClick={() => setIsOpen(true)}
        aria-label={t('supportCenter.openButtonAriaLabel')}
      >
        <span aria-hidden>?</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('supportCenter.title')}
        description={t('supportCenter.description')}
        bodyClassName="support-center-modal"
      >
        <section className="support-center-card support-center-card--slack">
          <div className="support-center-card__head">
            <img
              src={SLACK_PNG_URL}
              alt={t('supportCenter.slackLogoAlt')}
              className="support-center-brand-png"
              loading="lazy"
            />
            <h3>{t('supportCenter.slackTitle')}</h3>
          </div>
          <p className="support-center-card__lead">{t('supportCenter.lead')}</p>

          <a
            href={SUPPORT_SLACK_URL}
            target="_blank"
            rel="noreferrer"
            className="button button-primary support-center-link"
          >
            {t('supportCenter.openSupport')}
          </a>
        </section>
      </Modal>
    </>
  );
};
