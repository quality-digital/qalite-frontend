import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import { organizationService } from '../../application/services/OrganizationService';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';

export const AdminOrganizationsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizationForm, setOrganizationForm] = useState({ name: '', description: '' });
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

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
    setCurrentOrganization(null);
    setOrganizationForm({ name: '', description: '' });
    setFormError(null);
    setMemberError(null);
    setMemberEmail('');
    setIsModalOpen(true);
  };

  const openEditModal = (organization: Organization) => {
    setCurrentOrganization(organization);
    setOrganizationForm({ name: organization.name, description: organization.description });
    setFormError(null);
    setMemberError(null);
    setMemberEmail('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setMemberError(null);
    setMemberEmail('');
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = organizationForm.name.trim();
    if (!trimmedName) {
      setFormError('Informe um nome para a organização.');
      return;
    }

    const trimmedDescription = organizationForm.description.trim();

    try {
      setIsSavingOrganization(true);

      if (currentOrganization) {
        const updated = await organizationService.update(currentOrganization.id, {
          name: trimmedName,
          description: trimmedDescription
        });

        setOrganizations((previous) =>
          previous.map((organization) => (organization.id === updated.id ? updated : organization))
        );
        setCurrentOrganization(updated);
        showToast({ type: 'success', message: 'Organização atualizada com sucesso.' });
        return;
      }

      const created = await organizationService.create({ name: trimmedName, description: trimmedDescription });
      setOrganizations((previous) => [...previous, created]);
      showToast({ type: 'success', message: 'Nova organização criada.' });
      closeModal();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a organização.';
      setFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleDeleteOrganization = async (organizationId: string) => {
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization) {
      return;
    }

    const confirmation = window.confirm(
      `Deseja remover a organização "${organization.name}"? Os usuários serão desvinculados.`
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsSavingOrganization(true);
      await organizationService.delete(organizationId);
      setOrganizations((previous) => previous.filter((item) => item.id !== organizationId));
      showToast({ type: 'success', message: 'Organização removida com sucesso.' });
      if (currentOrganization?.id === organizationId) {
        closeModal();
        setCurrentOrganization(null);
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover a organização.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberError(null);

    if (!currentOrganization) {
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
        organizationId: currentOrganization.id,
        userEmail: trimmedEmail
      });

      setOrganizations((previous) =>
        previous.map((organization) => {
          if (organization.id !== currentOrganization.id) {
            return organization;
          }

          const hasMember = organization.memberIds.includes(member.uid);
          const members = hasMember ? organization.members : [...organization.members, member];
          const memberIds = hasMember ? organization.memberIds : [...organization.memberIds, member.uid];

          if (organization.id === currentOrganization.id) {
            setCurrentOrganization({ ...organization, members, memberIds });
          }

          return {
            ...organization,
            members,
            memberIds
          };
        })
      );

      setMemberEmail('');
      showToast({ type: 'success', message: 'Usuário adicionado à organização.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível adicionar o usuário.';
      setMemberError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!currentOrganization) {
      return;
    }

    const confirmation = window.confirm(
      `Remover ${member.displayName || member.email} da organização ${currentOrganization.name}?`
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: currentOrganization.id,
        userId: member.uid
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === currentOrganization.id
            ? {
                ...organization,
                members: organization.members.filter((item) => item.uid !== member.uid),
                memberIds: organization.memberIds.filter((item) => item !== member.uid)
              }
            : organization
        )
      );

      setCurrentOrganization((previous) =>
        previous
          ? {
              ...previous,
              members: previous.members.filter((item) => item.uid !== member.uid),
              memberIds: previous.memberIds.filter((item) => item !== member.uid)
            }
          : previous
      );

      showToast({ type: 'success', message: 'Usuário removido da organização.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover o usuário.';
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">Painel do administrador</span>
            <h1 className="section-title">Organizações cadastradas</h1>
            <p className="section-subtitle">
              Gerencie as organizações e mantenha os membros atualizados em um só lugar.
            </p>
          </div>
          <div className="page-actions">
            <Button type="button" onClick={openCreateModal}>
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
          <div className="dashboard-grid">
            {organizations.map((organization) => (
              <div key={organization.id} className="card">
                <div className="card-header">
                  <h2 className="card-title">{organization.name}</h2>
                  <span className="badge">
                    {organization.members.length} membro{organization.members.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="card-description">
                  {organization.description || 'Organização sem descrição cadastrada até o momento.'}
                </p>
                <div className="card-actions">
                  <Button type="button" onClick={() => openEditModal(organization)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(`/admin/organizations?organizationId=${organization.id}`)}
                  >
                    Ver lojas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleDeleteOrganization(organization.id)}
                    disabled={isSavingOrganization}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={currentOrganization ? 'Editar organização' : 'Nova organização'}
        description={
          currentOrganization
            ? 'Atualize as informações e gerencie o time vinculado a esta organização.'
            : 'Cadastre uma nova organização para liberar o acesso ao QaLite.'
        }
      >
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <form className="form-grid" onSubmit={handleOrganizationSubmit}>
          <TextInput
            id="organization-name"
            label="Nome da organização"
            value={organizationForm.name}
            onChange={(event) => setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="Ex.: Squad de Onboarding"
            required
          />
          <TextArea
            id="organization-description"
            label="Descrição"
            value={organizationForm.description}
            onChange={(event) =>
              setOrganizationForm((previous) => ({ ...previous, description: event.target.value }))
            }
            placeholder="Resuma o objetivo principal desta organização"
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isSavingOrganization} loadingText="Salvando...">
              {currentOrganization ? 'Salvar alterações' : 'Criar organização'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isSavingOrganization}>
              Cancelar
            </Button>
          </div>
        </form>

        {currentOrganization && (
          <div className="card bg-surface" style={{ padding: '1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Membros vinculados</h3>
                <p className="section-subtitle">Adicione usuários pelo e-mail cadastrado no QaLite.</p>
              </div>
              <span className="badge">
                {currentOrganization.members.length} membro
                {currentOrganization.members.length === 1 ? '' : 's'}
              </span>
            </div>

            {memberError && <p className="form-message form-message--error">{memberError}</p>}

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

            {currentOrganization.members.length === 0 ? (
              <p className="section-subtitle">
                Nenhum usuário vinculado ainda. Adicione membros utilizando o e-mail cadastrado no QaLite.
              </p>
            ) : (
              <ul className="member-list">
                {currentOrganization.members.map((member) => (
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
        )}
      </Modal>
    </Layout>
  );
};
