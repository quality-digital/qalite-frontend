import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { Alert } from '../components/Alert';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { TextInput } from '../components/TextInput';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserAvatar } from '../components/UserAvatar';
import { ThemeIcon } from '../components/icons';

export const ProfilePage = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [browserstackUsername, setBrowserstackUsername] = useState('');
  const [browserstackAccessKey, setBrowserstackAccessKey] = useState('');
  const [isBrowserstackSectionOpen, setIsBrowserstackSectionOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    const username = user?.browserstackCredentials?.username ?? '';
    const accessKey = user?.browserstackCredentials?.accessKey ?? '';
    setBrowserstackUsername(username);
    setBrowserstackAccessKey(accessKey);
    setIsBrowserstackSectionOpen(Boolean(username.trim() || accessKey.trim()));
  }, [
    user?.browserstackCredentials?.accessKey,
    user?.browserstackCredentials?.username,
    user?.firstName,
    user?.lastName,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName) {
      setLocalError('Informe seu nome para continuar.');
      return;
    }

    if (!trimmedLastName) {
      setLocalError('Informe seu sobrenome para continuar.');
      return;
    }

    const trimmedBrowserstackUsername = browserstackUsername.trim();
    const trimmedBrowserstackAccessKey = browserstackAccessKey.trim();
    const browserstackCredentials = isBrowserstackSectionOpen
      ? {
          username: trimmedBrowserstackUsername || undefined,
          accessKey: trimmedBrowserstackAccessKey || undefined,
        }
      : null;

    try {
      await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        browserstackCredentials,
      });
      if (!isBrowserstackSectionOpen) {
        setBrowserstackUsername('');
        setBrowserstackAccessKey('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fullName = `${firstName} ${lastName}`.trim() || user?.displayName || user?.email || '';

  return (
    <Layout>
      <section className="card profile-card">
        <div className="profile-toolbar">
          <BackButton label="Voltar" />
          <div className="profile-theme">
            <ThemeIcon aria-hidden className="icon" />
            <span>Modo de exibição</span>
            <ThemeToggle />
          </div>
        </div>

        <span className="badge">Seu perfil</span>
        <h1 className="section-title">Atualize suas informações pessoais</h1>
        <p className="section-subtitle">
          Ajuste seu nome e veja as mudanças refletidas imediatamente em todos os seus acessos.
        </p>

        {localError && <Alert type="error" message={localError} />}

        <form className="profile-editor" onSubmit={handleSubmit}>
          <div className="profile-header">
            <UserAvatar name={fullName} />
          </div>

          <TextInput
            id="firstName"
            label="Nome"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />

          <TextInput
            id="lastName"
            label="Sobrenome"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />

          <TextInput
            id="email"
            label="E-mail"
            type="email"
            value={user?.email ?? ''}
            onChange={() => {}}
            readOnly
            disabled
          />

          <div className="collapsible-section">
            <div className="collapsible-section__header">
              <div className="collapsible-section__titles">
                <img
                  className="collapsible-section__icon"
                  src="https://img.icons8.com/color/48/browser-stack.png"
                  alt="BrowserStack"
                />
                <p className="collapsible-section__title">Credenciais do BrowserStack</p>
                <p className="collapsible-section__description">
                  As integrações usam credenciais pessoais. Ative apenas se precisar atualizar seus
                  dados.
                </p>
              </div>
              <label className="collapsible-section__toggle">
                <input
                  type="checkbox"
                  checked={isBrowserstackSectionOpen}
                  onChange={() => {
                    setIsBrowserstackSectionOpen((previous) => {
                      const nextValue = !previous;
                      if (!nextValue) {
                        setBrowserstackUsername('');
                        setBrowserstackAccessKey('');
                      }
                      return nextValue;
                    });
                  }}
                  aria-expanded={isBrowserstackSectionOpen}
                  aria-controls="profile-browserstack-section"
                />
                <span>{isBrowserstackSectionOpen ? 'Ativado' : 'Desativado'}</span>
              </label>
            </div>
            {isBrowserstackSectionOpen && (
              <div className="collapsible-section__body" id="profile-browserstack-section">
                <TextInput
                  id="browserstack-username"
                  label="Usuário do BrowserStack"
                  value={browserstackUsername}
                  onChange={(event) => setBrowserstackUsername(event.target.value)}
                  placeholder="username"
                />
                <TextInput
                  id="browserstack-access-key"
                  label="Access key do BrowserStack"
                  type="password"
                  value={browserstackAccessKey}
                  onChange={(event) => setBrowserstackAccessKey(event.target.value)}
                  placeholder="access key"
                />
                <p className="form-hint">
                  Armazenamos as credenciais apenas para uso nas suas integrações pessoais com o
                  BrowserStack.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" isLoading={isLoading} loadingText="Salvando...">
            Salvar alterações
          </Button>
        </form>
      </section>
    </Layout>
  );
};
