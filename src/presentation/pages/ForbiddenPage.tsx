import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useTranslation } from 'react-i18next';

export const ForbiddenPage = () => {
  const { t: translation } = useTranslation();

  return (
    <Layout>
      <section className="mx-auto max-w-md rounded-2xl bg-surface p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-danger">403</h1>

        <p className="mt-4 text-muted">{translation('forbiddenPage.description')}</p>

        <Link to="/" className="button button-primary mt-6 inline-flex">
          {translation('backToHome')}
        </Link>
      </section>
    </Layout>
  );
};
