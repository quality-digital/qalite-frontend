import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const APP_NAME = 'QALite';
const DEFAULT_DESCRIPTION =
  'QALite ajuda times de QA a organizar lojas, ambientes e execuções de testes com mais velocidade e visibilidade.';

const setMetaTag = (selector: string, content: string) => {
  const tag = document.querySelector<HTMLMetaElement>(selector);
  if (tag) {
    tag.setAttribute('content', content);
  }
};

const setCanonical = (href: string) => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (link) {
    link.setAttribute('href', href);
  }
};

const getRouteMetadata = (pathname: string) => {
  if (pathname === '/') {
    return {
      title: `Início | ${APP_NAME}`,
      description: 'Central de acesso da plataforma QALite para gestão de qualidade de software.',
    };
  }

  if (pathname.startsWith('/login')) {
    return {
      title: `Login | ${APP_NAME}`,
      description: 'Acesse sua conta no QALite para acompanhar ambientes, cenários e resultados de QA.',
    };
  }

  if (pathname.startsWith('/register')) {
    return {
      title: `Criar conta | ${APP_NAME}`,
      description: 'Crie sua conta no QALite e comece a organizar seu fluxo de testes e validações.',
    };
  }

  if (pathname.startsWith('/forgot-password')) {
    return {
      title: `Recuperar senha | ${APP_NAME}`,
      description: 'Recupere o acesso à sua conta QALite com segurança.',
    };
  }

  if (pathname.startsWith('/reset-password')) {
    return {
      title: `Redefinir senha | ${APP_NAME}`,
      description: 'Defina uma nova senha para continuar usando o QALite.',
    };
  }

  if (pathname.startsWith('/dashboard')) {
    return {
      title: `Dashboard | ${APP_NAME}`,
      description: 'Acompanhe indicadores, lojas e ambientes da sua organização no QALite.',
    };
  }

  if (pathname.startsWith('/organization')) {
    return {
      title: `Organização | ${APP_NAME}`,
      description: 'Gerencie dados da sua organização e acompanhe o ecossistema de QA.',
    };
  }

  if (pathname.startsWith('/no-organization')) {
    return {
      title: `Entrar em organização | ${APP_NAME}`,
      description: 'Solicite acesso a uma organização para começar a usar os recursos do QALite.',
    };
  }

  if (pathname.startsWith('/profile')) {
    return {
      title: `Perfil | ${APP_NAME}`,
      description: 'Atualize suas informações pessoais e preferências dentro do QALite.',
    };
  }

  if (pathname.startsWith('/stores/')) {
    return {
      title: `Resumo da loja | ${APP_NAME}`,
      description: 'Consulte os cenários, progresso e métricas de uma loja na plataforma QALite.',
    };
  }

  if (pathname.startsWith('/environments/') && pathname.endsWith('/public')) {
    return {
      title: `Ambiente público | ${APP_NAME}`,
      description: 'Visualização pública de evidências e andamento do ambiente de testes.',
    };
  }

  if (pathname.startsWith('/environments/')) {
    return {
      title: `Ambiente de testes | ${APP_NAME}`,
      description: 'Gerencie o ciclo de vida de ambientes, execução de cenários e bugs no QALite.',
    };
  }

  if (pathname === '/admin') {
    return {
      title: `Admin • Organizações | ${APP_NAME}`,
      description: 'Painel administrativo para listar e administrar organizações no QALite.',
    };
  }

  if (pathname.startsWith('/admin/organizations')) {
    return {
      title: `Admin • Lojas | ${APP_NAME}`,
      description: 'Painel administrativo para gestão de lojas, membros e acessos por organização.',
    };
  }

  if (pathname.startsWith('/403')) {
    return {
      title: `Acesso negado | ${APP_NAME}`,
      description: 'Você não possui permissão para acessar este conteúdo no momento.',
    };
  }

  return {
    title: APP_NAME,
    description: DEFAULT_DESCRIPTION,
  };
};

export const RouteSeo = () => {
  const location = useLocation();

  const metadata = useMemo(() => getRouteMetadata(location.pathname), [location.pathname]);

  useEffect(() => {
    document.title = metadata.title;
    setMetaTag('meta[name="description"]', metadata.description);
    setMetaTag('meta[property="og:title"]', metadata.title);
    setMetaTag('meta[property="og:description"]', metadata.description);
    setMetaTag('meta[property="og:url"]', `${window.location.origin}${location.pathname}`);
    setMetaTag('meta[name="twitter:title"]', metadata.title);
    setMetaTag('meta[name="twitter:description"]', metadata.description);
    setMetaTag('meta[name="robots"]', 'index, follow');
    setCanonical(`${window.location.origin}${location.pathname}`);
  }, [location.pathname, metadata]);

  return null;
};
