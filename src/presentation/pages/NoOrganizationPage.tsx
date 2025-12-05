import { Layout } from '../components/Layout';
import { useTranslation } from 'react-i18next';

export const NoOrganizationPage = () => {

  const { t } = useTranslation();

  return (
    <Layout>
    <section className="list-grid">
      <div className="card">
        <span className="badge">{t('noOrganization.badge')}</span>
        <h1 className="section-title">{t('noOrganization.title')}</h1>
        <p className="section-subtitle">
          {t('noOrganization.subtitle')}
        </p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-primary">{t('noOrganization.steps')}</h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted">
          <li>{t('noOrganization.update')} &quot;{t('profile')}&quot;.</li>
          <li>{t('noOrganization.confirm')}</li>
          <li>{t('noOrganization.invite')}</li>
        </ul>
      </div>
    </section>
  </Layout>
  );
};
