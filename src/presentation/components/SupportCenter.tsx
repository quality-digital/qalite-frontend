import { useState } from 'react';
import { Modal } from './Modal';

interface SupportCenterProps {
  compact?: boolean;
}

const SUPPORT_SLACK_URL = 'https://qualitydigitalsa.slack.com/archives/C0B3U4CP5L2';
const CREDITS_GITHUB_URL = 'https://github.com/sntooosk';

export const SupportCenter = ({ compact = false }: SupportCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={['support-center-trigger', compact ? 'support-center-trigger--compact' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => setIsOpen(true)}
      >
        Suporte
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Central de Suporte"
        description="Ajuda rápida, canais de contato e créditos do software."
        bodyClassName="support-center-modal"
      >
        <section className="support-center-card">
          <h3>Canal oficial no Slack</h3>
          <p>
            Abra um chamado, tire dúvidas técnicas e acompanhe os comunicados da equipe diretamente
            no canal oficial.
          </p>
          <a
            href={SUPPORT_SLACK_URL}
            target="_blank"
            rel="noreferrer"
            className="support-center-link"
          >
            Acessar canal de suporte no Slack
          </a>
        </section>

        <section className="support-center-card support-center-card--credits">
          <h3>Créditos do software</h3>
          <p>
            Projeto e desenvolvimento por <strong>Juliano Cassimiro</strong>.
          </p>
          <a
            href={CREDITS_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="support-center-link"
          >
            Ver GitHub de Juliano Cassimiro
          </a>
        </section>
      </Modal>
    </>
  );
};
