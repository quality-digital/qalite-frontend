import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import type { Store } from '../../domain/entities/Store';
import { organizationService } from '../../main/factories/organizationServiceFactory';
import { storeService } from '../../main/factories/storeServiceFactory';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { SelectInput } from '../components/SelectInput';
import { Modal } from '../components/Modal';
import { TextArea } from '../components/TextArea';
import { UserAvatar } from '../components/UserAvatar';

interface StoreForm {
  name: string;
  site: string;
}

const initialStoreForm: StoreForm = {
  name: '',
  site: '',
};

export const AdminStoresPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isOrganizationLocked, setIsOrganizationLocked] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreForm>(initialStoreForm);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] = useState({ name: '', description: '' });
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true);
        const data = await organizationService.list();
        setOrganizations(data);
        const organizationFromParam = searchParams.get('organizationId');
        const hasValidOrganizationParam = Boolean(
          organizationFromParam && data.some((item) => item.id === organizationFromParam),
        );

        if (hasValidOrganizationParam && organizationFromParam) {
          setSelectedOrganizationId(organizationFromParam);
          setIsOrganizationLocked(true);
          return;
        }

        setIsOrganizationLocked(false);
        if (data.length > 0) {
          setSelectedOrganizationId(data[0].id);
        } else {
          setSelectedOrganizationId('');
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as organizações.' });
      } finally {
        setIsLoadingOrganizations(false);
      }
    };

    void fetchOrganizations();
  }, [searchParams, showToast]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setStores([]);
      return;
    }

    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const data = await storeService.listByOrganization(selectedOrganizationId);
        setStores(data);
        setSearchParams({ organizationId: selectedOrganizationId });
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          message: 'Não foi possível carregar as lojas desta organização.',
        });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [selectedOrganizationId, setSearchParams, showToast]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );

  const openCreateModal = () => {
    setStoreForm(initialStoreForm);
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const closeStoreModal = () => {
    setIsStoreModalOpen(false);
    setStoreForm(initialStoreForm);
    setStoreError(null);
  };

  const openOrganizationModal = () => {
    if (!selectedOrganization) {
      return;
    }

    setOrganizationForm({
      name: selectedOrganization.name,
      description: selectedOrganization.description,
    });
    setOrganizationError(null);
    setMemberEmail('');
    setMemberError(null);
    setIsOrganizationModalOpen(true);
  };

  const closeOrganizationModal = () => {
    setIsOrganizationModalOpen(false);
    setOrganizationError(null);
    setMemberEmail('');
    setMemberError(null);
  };

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreError(null);

    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();

    if (!selectedOrganizationId) {
      setStoreError('Selecione uma organização antes de cadastrar a loja.');
      return;
    }

    if (!trimmedName) {
      setStoreError('Informe o nome da loja.');
      return;
    }

    if (!trimmedSite) {
      setStoreError('Informe o site da loja.');
      return;
    }

    try {
      setIsSavingStore(true);

      const created = await storeService.create({
        organizationId: selectedOrganizationId,
        name: trimmedName,
        site: trimmedSite,
        stage: '',
      });

      setStores((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
      showToast({ type: 'success', message: 'Nova loja cadastrada.' });
      closeStoreModal();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a loja.';
      setStoreError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrganizationError(null);

    if (!selectedOrganization) {
      return;
    }

    const trimmedName = organizationForm.name.trim();
    const trimmedDescription = organizationForm.description.trim();

    if (!trimmedName) {
      setOrganizationError('Informe um nome para a organização.');
      return;
    }

    try {
      setIsSavingOrganization(true);
      const updated = await organizationService.update(selectedOrganization.id, {
        name: trimmedName,
        description: trimmedDescription,
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === updated.id
            ? { ...organization, name: updated.name, description: updated.description }
            : organization,
        ),
      );
      showToast({ type: 'success', message: 'Organização atualizada com sucesso.' });
      closeOrganizationModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar a organização.';
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) {
      return;
    }

    const confirmation = window.confirm(
      `Deseja remover a organização "${selectedOrganization.name}"? Os usuários serão desvinculados.`,
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsSavingOrganization(true);
      await organizationService.delete(selectedOrganization.id);
      const remainingOrganizations = organizations.filter(
        (item) => item.id !== selectedOrganization.id,
      );
      setOrganizations(remainingOrganizations);
      setStores([]);
      closeOrganizationModal();
      showToast({ type: 'success', message: 'Organização removida com sucesso.' });

      if (remainingOrganizations.length === 0) {
        setSelectedOrganizationId('');
        setSearchParams({});
        navigate('/admin');
      } else {
        const fallbackId = remainingOrganizations[0].id;
        setSelectedOrganizationId(fallbackId);
        setSearchParams({ organizationId: fallbackId });
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover a organização.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberError(null);

    if (!selectedOrganization) {
      return;
    }

    const trimmedEmail = memberEmail.trim();
    if (!trimmedEmail) {
      setMemberError('Informe o e-mail do usuário.');
      return;
    }

    try {
      setIsManagingMembers(true);
      const member = await organizationService.addUser({
        organizationId: selectedOrganization.id,
        userEmail: trimmedEmail,
      });

      setOrganizations((previous) =>
        previous.map((organization) => {
          if (organization.id !== selectedOrganization.id) {
            return organization;
          }

          const hasMember = organization.memberIds.includes(member.uid);
          return {
            ...organization,
            members: hasMember ? organization.members : [...organization.members, member],
            memberIds: hasMember ? organization.memberIds : [...organization.memberIds, member.uid],
          };
        }),
      );

      setMemberEmail('');
      showToast({ type: 'success', message: 'Usuário adicionado à organização.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível adicionar o usuário.';
      setMemberError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!selectedOrganization) {
      return;
    }

    const confirmation = window.confirm(
      `Remover ${member.displayName || member.email} da organização ${selectedOrganization.name}?`,
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: selectedOrganization.id,
        userId: member.uid,
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === selectedOrganization.id
            ? {
                ...organization,
                members: organization.members.filter((item) => item.uid !== member.uid),
                memberIds: organization.memberIds.filter((item) => item !== member.uid),
              }
            : organization,
        ),
      );

      showToast({ type: 'success', message: 'Usuário removido da organização.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover o usuário.';
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate('/admin')}>
              &larr; Voltar
            </button>
            <span className="badge">Painel do administrador</span>
            <h1 className="section-title">
              {selectedOrganization
                ? `Lojas da organização ${selectedOrganization.name}`
                : 'Lojas da organização'}
            </h1>
            <p className="section-subtitle">
              {isOrganizationLocked
                ? 'Para trocar a organização, utilize o botão Voltar e selecione outra opção.'
                : 'Escolha uma organização para visualizar e administrar suas lojas.'}
            </p>
          </div>
          <div className="page-actions">
            {isOrganizationLocked ? (
              <div className="selected-organization-info">
                <span className="badge">
                  {selectedOrganization?.name ?? 'Organização selecionada'}
                </span>
              </div>
            ) : (
              <SelectInput
                id="organization-selector"
                label="Organização"
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
                options={organizations.map((organization) => ({
                  value: organization.id,
                  label: organization.name,
                }))}
                disabled={isLoadingOrganizations || organizations.length === 0}
              />
            )}
            {selectedOrganization && (
              <Button type="button" variant="secondary" onClick={openOrganizationModal}>
                Gerenciar organização
              </Button>
            )}
            <Button type="button" onClick={openCreateModal} disabled={!selectedOrganizationId}>
              Nova loja
            </Button>
          </div>
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">Carregando lojas vinculadas...</p>
        ) : stores.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhuma loja cadastrada</h2>
            <p className="section-subtitle">
              Utilize o botão acima para cadastrar a primeira loja desta organização.
            </p>
            <Button type="button" onClick={openCreateModal} disabled={!selectedOrganizationId}>
              Nova loja
            </Button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {stores.map((store) => (
              <div
                key={store.id}
                className="card card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/stores/${store.id}`)}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, () => navigate(`/stores/${store.id}`))
                }
              >
                <div className="card-header">
                  <div>
                    <h2 className="card-title">{store.name}</h2>
                    <p className="card-subtitle">{selectedOrganization?.name ?? 'Organização'}</p>
                  </div>
                  <span className="badge">{store.scenarioCount} cenários</span>
                </div>
                <p className="card-description">
                  <span>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </span>
                </p>
                <div className="card-link-hint">
                  <span>Abrir loja</span>
                  <span aria-hidden>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isStoreModalOpen}
        onClose={closeStoreModal}
        title="Nova loja"
        description="Informe os dados básicos da loja para disponibilizar os cenários."
      >
        {storeError && <p className="form-message form-message--error">{storeError}</p>}
        <form className="form-grid" onSubmit={handleStoreSubmit}>
          <TextInput
            id="store-name"
            label="Nome da loja"
            value={storeForm.name}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, name: event.target.value }))
            }
            placeholder="Ex.: Loja QA"
            required
          />
          <TextInput
            id="store-site"
            label="URL do site"
            value={storeForm.site}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, site: event.target.value }))
            }
            placeholder="https://minhaloja.com"
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isSavingStore} loadingText="Salvando...">
              Criar loja
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreModal}
              disabled={isSavingStore}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {selectedOrganization && (
        <Modal
          isOpen={isOrganizationModalOpen}
          onClose={closeOrganizationModal}
          title={`Gerenciar ${selectedOrganization.name}`}
          description="Atualize as informações e gerencie os membros desta organização."
        >
          {organizationError && (
            <p className="form-message form-message--error">{organizationError}</p>
          )}

          <form className="form-grid" onSubmit={handleOrganizationSubmit}>
            <TextInput
              id="organization-name"
              label="Nome da organização"
              value={organizationForm.name}
              onChange={(event) =>
                setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder="Ex.: Squad de Onboarding"
              required
            />
            <TextArea
              id="organization-description"
              label="Descrição"
              value={organizationForm.description}
              onChange={(event) =>
                setOrganizationForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              placeholder="Resuma o objetivo principal desta organização"
            />
            <div className="form-actions">
              <Button type="submit" isLoading={isSavingOrganization} loadingText="Salvando...">
                Salvar alterações
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeOrganizationModal}
                disabled={isSavingOrganization}
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div className="card bg-surface" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Membros vinculados</h3>
                <p className="section-subtitle">
                  Adicione usuários pelo e-mail cadastrado no QaLite.
                </p>
              </div>
              <span className="badge">
                {selectedOrganization.members.length} membro
                {selectedOrganization.members.length === 1 ? '' : 's'}
              </span>
            </div>

            {memberError && (
              <p className="form-message form-message--error" style={{ marginTop: '1rem' }}>
                {memberError}
              </p>
            )}

            <form className="organization-members-form" onSubmit={handleAddMember}>
              <TextInput
                id="member-email"
                label="Adicionar usuário por e-mail"
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
              <Button type="submit" isLoading={isManagingMembers} loadingText="Adicionando...">
                Adicionar usuário
              </Button>
            </form>

            {selectedOrganization.members.length === 0 ? (
              <p className="section-subtitle">
                Nenhum usuário vinculado ainda. Adicione membros utilizando o e-mail cadastrado no
                QaLite.
              </p>
            ) : (
              <ul className="member-list">
                {selectedOrganization.members.map((member) => (
                  <li key={member.uid} className="member-list-item">
                    <UserAvatar
                      name={member.displayName || member.email}
                      photoURL={member.photoURL ?? undefined}
                    />
                    <div className="member-list-details">
                      <span className="member-list-name">{member.displayName || member.email}</span>
                      <span className="member-list-email">{member.email}</span>
                    </div>
                    <button
                      type="button"
                      className="member-list-remove"
                      onClick={() => void handleRemoveMember(member)}
                      disabled={isManagingMembers}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-danger-zone">
            <div>
              <h4>Zona sensível</h4>
              <p>Remova a organização e desvincule todos os usuários.</p>
            </div>
            <button
              type="button"
              className="link-danger"
              onClick={() => void handleDeleteOrganization()}
              disabled={isSavingOrganization}
            >
              Excluir organização
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
