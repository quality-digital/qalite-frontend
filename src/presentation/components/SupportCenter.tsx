import { useState } from 'react';
import { SiGithub } from 'react-icons/si';
import { StorefrontIcon, MessageCircleIcon } from './icons';
import { Modal } from './Modal';

interface SupportCenterProps {
  compact?: boolean;
  context?: 'default' | 'login';
}

const SUPPORT_SLACK_URL = 'https://qualitydigitalsa.slack.com/archives/C0B3U4CP5L2';
const CREDITS_GITHUB_URL = 'https://github.com/sntooosk';

export const SupportCenter = ({ compact = false, context = 'default' }: SupportCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLogin = context === 'login';

  return (
    <>
      <button
        type="button"
        className={['support-center-trigger', compact ? 'support-center-trigger--compact' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => setIsOpen(true)}
      >
        {isLogin ? <SiGithub aria-hidden className="support-center-trigger__icon" /> : <StorefrontIcon aria-hidden className="support-center-trigger__icon" />}
        Suporte
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Central de suporte"
        description="Atalhos rápidos para suporte técnico e créditos do software."
        bodyClassName="support-center-modal"
      >
        <section className="support-center-card support-center-card--slack">
          <div className="support-center-card__head">
            <MessageCircleIcon aria-hidden className="support-center-brand-icon" />
            <h3>Suporte no Slack</h3>
          </div>
          <p>Tire dúvidas técnicas e acompanhe os comunicados da equipe no canal oficial.</p>
          <a href={SUPPORT_SLACK_URL} target="_blank" rel="noreferrer" className="support-center-link">
            Abrir canal no Slack
          </a>
        </section>

        <section className="support-center-card support-center-card--credits">
          <div className="support-center-card__head">
            <SiGithub aria-hidden className="support-center-brand-icon" />
            <h3>Créditos do software</h3>
          </div>
          <p>
            Projeto e desenvolvimento por <strong>Juliano Cassimiro</strong>.
          </p>
          <a href={CREDITS_GITHUB_URL} target="_blank" rel="noreferrer" className="support-center-link">
            Ver perfil no GitHub
          </a>
        </section>
      </Modal>
    </>
  );
};
