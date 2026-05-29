import { useState } from 'react';
import { Modal } from './Modal';

const SUPPORT_SLACK_URL = 'https://qualitydigitalsa.slack.com/archives/C0B3U4CP5L2';
const SLACK_PNG_URL =
  'https://img.icons8.com/external-tal-revivo-color-tal-revivo/24/external-slack-replace-email-text-messaging-and-instant-messaging-for-your-team-logo-color-tal-revivo.png';

export const SupportCenter = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="support-center-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir central de suporte"
      >
        <span aria-hidden>?</span>
        <span>Ajuda</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Suporte"
        description="Canal rápido para dúvidas técnicas e acompanhamento de comunicados."
        bodyClassName="support-center-modal"
      >
        <section className="support-center-card support-center-card--slack">
          <div className="support-center-card__head">
            <img
              src={SLACK_PNG_URL}
              alt="Slack"
              className="support-center-brand-png"
              loading="lazy"
            />
            <h3>Slack</h3>
          </div>
          <p>Abra o canal oficial para falar com o suporte e acompanhar atualizações.</p>
          <a
            href={SUPPORT_SLACK_URL}
            target="_blank"
            rel="noreferrer"
            className="support-center-link"
          >
            Abrir suporte
          </a>
        </section>
      </Modal>
    </>
  );
};
