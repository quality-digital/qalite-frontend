import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { Modal } from '../components/Modal';

interface OrganizationFormState {
  name: string;
  logoFile: File | null;
  slackWebhookUrl: string;
  browserstackUsername: string;
  browserstackPassword: string;
}

const initialOrganizationForm: OrganizationFormState = {
  name: '',
  logoFile: null,
  slackWebhookUrl: '',
  browserstackUsername: '',
  browserstackPassword: '',
};

const buildBrowserstackCredentialsPayload = ({
  browserstackUsername,
  browserstackPassword,
}: OrganizationFormState) => {
  const username = browserstackUsername.trim();
  const password = browserstackPassword.trim();

  if (!username && !password) {
    return null;
  }

  return { username, password };
};

export const AdminOrganizationsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(initialOrganizationForm);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        const data = await organizationService.list();
        setOrganizations(data);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as organizações.' });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrganizations();
  }, [showToast]);

  const openCreateModal = () => {
    setOrganizationForm(initialOrganizationForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setOrganizationForm(initialOrganizationForm);
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = organizationForm.name.trim();
    if (!trimmedName) {
      setFormError('Informe um nome para a organização.');
      return;
    }

    try {
      setIsSavingOrganization(true);

      const created = await organizationService.create({
        name: trimmedName,
        description: '',
        logoFile: organizationForm.logoFile,
        slackWebhookUrl: organizationForm.slackWebhookUrl,
        browserstackCredentials: buildBrowserstackCredentialsPayload(organizationForm),
      });
      setOrganizations((previous) => [...previous, created]);
      showToast({ type: 'success', message: 'Nova organização criada.' });
      closeModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar a organização.';
      setFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  return (
    <Layout>
      <section className="page-container" data-testid="organizations-page">
        <div className="page-header">
          <div>
            <h1 className="section-title">Organizações cadastradas</h1>
            <p className="section-subtitle">
              Gerencie as organizações e mantenha os membros atualizados em um só lugar.
            </p>
          </div>
          <div className="page-actions">
            <Button type="button" onClick={openCreateModal} data-testid="new-organization-button">
              Nova organização
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">Carregando organizações do Firestore...</p>
        ) : organizations.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhuma organização cadastrada</h2>
            <p className="section-subtitle">
              Utilize o botão acima para cadastrar a primeira organização.
            </p>
            <Button type="button" onClick={openCreateModal}>
              Nova organização
            </Button>
          </div>
        ) : (
          <>
            <div className="dashboard-grid">
              {organizations.map((organization) => (
                <div
                  key={organization.id}
                  className="card card-clickable"
                  data-testid={`organization-card-${organization.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/organizations?organizationId=${organization.id}`)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () =>
                      navigate(`/admin/organizations?organizationId=${organization.id}`),
                    )
                  }
                >
                  <div className="organization-card-header">
                    <div>
                      <h2 className="card-title">{organization.name}</h2>
                    </div>
                  </div>
                  <div className="organization-card-footer">
                    <span className="badge">
                      {organization.members.length} membro
                      {organization.members.length === 1 ? '' : 's'}
                    </span>
                    <div className="card-link-hint">
                      <span>Ver lojas</span>
                      <span aria-hidden>&rarr;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Nova organização">
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <form
          className="form-grid"
          onSubmit={handleOrganizationSubmit}
          data-testid="organization-form"
        >
          <TextInput
            id="organization-name"
            label="Nome da organização"
            value={organizationForm.name}
            onChange={(event) =>
              setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))
            }
            placeholder="Ex.: Squad de Onboarding"
            required
            dataTestId="organization-name-input"
          />
          <TextInput
            id="organization-slack-webhook"
            label="Webhook do Slack"
            value={organizationForm.slackWebhookUrl}
            onChange={(event) =>
              setOrganizationForm((previous) => ({
                ...previous,
                slackWebhookUrl: event.target.value,
              }))
            }
            placeholder="https://hooks.slack.com/services/..."
            dataTestId="organization-slack-webhook-input"
          />
          <TextInput
            id="organization-browserstack-username"
            label="Usuário do BrowserStack"
            value={organizationForm.browserstackUsername}
            onChange={(event) =>
              setOrganizationForm((previous) => ({
                ...previous,
                browserstackUsername: event.target.value,
              }))
            }
            placeholder="username"
            dataTestId="organization-browserstack-username-input"
          />
          <TextInput
            id="organization-browserstack-password"
            label="Senha do BrowserStack"
            type="password"
            value={organizationForm.browserstackPassword}
            onChange={(event) =>
              setOrganizationForm((previous) => ({
                ...previous,
                browserstackPassword: event.target.value,
              }))
            }
            placeholder="password"
            dataTestId="organization-browserstack-password-input"
          />
          <label className="upload-label" htmlFor="organization-logo">
            <span>Logo da organização</span>
            <span className="upload-trigger">Selecionar arquivo</span>
            <input
              id="organization-logo"
              className="upload-input"
              type="file"
              accept="image/*"
              data-testid="organization-logo-input"
              onChange={(event) =>
                setOrganizationForm((previous) => ({
                  ...previous,
                  logoFile: event.target.files?.[0] ?? null,
                }))
              }
            />
            <span className="upload-hint">Formatos sugeridos: PNG, JPG ou SVG até 5MB.</span>
          </label>
          <div className="form-actions">
            <Button
              type="submit"
              isLoading={isSavingOrganization}
              loadingText="Salvando..."
              data-testid="save-organization-button"
            >
              Criar organização
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={isSavingOrganization}
              data-testid="cancel-organization-button"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
