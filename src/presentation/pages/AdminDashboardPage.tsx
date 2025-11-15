import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import { organizationService } from '../../application/services/OrganizationService';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { UserAvatar } from '../components/UserAvatar';

export const AdminDashboardPage = () => {
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [organizationForm, setOrganizationForm] = useState({ name: '', description: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        const data = await organizationService.list();
        setOrganizations(data);

        if (data.length > 0) {
          setSelectedOrganizationId(data[0].id);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as organizações.' });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrganizations();
  }, [showToast]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  );

  useEffect(() => {
    if (isCreatingNew) {
      setOrganizationForm({ name: '', description: '' });
      return;
    }

    if (selectedOrganization) {
      setOrganizationForm({
        name: selectedOrganization.name,
        description: selectedOrganization.description
      });
    }
  }, [isCreatingNew, selectedOrganization]);

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setSelectedOrganizationId(null);
    setOrganizationForm({ name: '', description: '' });
    setFormError(null);
    setMemberError(null);
    setMemberEmail('');
  };

  const handleSelectOrganization = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    setIsCreatingNew(false);
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

      if (isCreatingNew) {
        const created = await organizationService.create({
          name: trimmedName,
          description: trimmedDescription
        });

        setOrganizations((previous) => [...previous, created]);
        setSelectedOrganizationId(created.id);
        setIsCreatingNew(false);
        showToast({ type: 'success', message: 'Organização criada com sucesso.' });
        return;
      }

      if (!selectedOrganization) {
        showToast({ type: 'error', message: 'Selecione uma organização para atualizar.' });
        return;
      }

      const updated = await organizationService.update(selectedOrganization.id, {
        name: trimmedName,
        description: trimmedDescription
      });

      setOrganizations((previous) =>
        previous.map((organization) => (organization.id === updated.id ? updated : organization))
      );
      showToast({ type: 'success', message: 'Organização atualizada.' });
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
      const remaining = organizations.filter((item) => item.id !== organizationId);
      setOrganizations(remaining);

      if (selectedOrganizationId === organizationId) {
        setSelectedOrganizationId(remaining[0]?.id ?? null);
        setIsCreatingNew(false);
        setOrganizationForm({ name: '', description: '' });
        setMemberEmail('');
      }

      showToast({ type: 'success', message: 'Organização removida com sucesso.' });
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

    if (!selectedOrganization) {
      setMemberError('Selecione uma organização para adicionar membros.');
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
        userEmail: trimmedEmail
      });

      setOrganizations((previous) =>
        previous.map((organization) => {
          if (organization.id !== selectedOrganization.id) {
            return organization;
          }

          const hasMember = organization.memberIds.includes(member.uid);
          const members = hasMember
            ? organization.members
            : [...organization.members, member];

          const memberIds = hasMember
            ? organization.memberIds
            : [...organization.memberIds, member.uid];

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
    if (!selectedOrganization) {
      return;
    }

    const confirmation = window.confirm(
      `Remover ${member.displayName || member.email} da organização ${selectedOrganization.name}?`
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: selectedOrganization.id,
        userId: member.uid
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === selectedOrganization.id
            ? {
                ...organization,
                members: organization.members.filter((item) => item.uid !== member.uid),
                memberIds: organization.memberIds.filter((item) => item !== member.uid)
              }
            : organization
        )
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
      <section className="organization-admin">
        <div className="card organization-admin-list">
          <div className="organization-admin-header">
            <div>
              <span className="badge">Painel do administrador</span>
              <h1 className="section-title">Gerencie as organizações da plataforma</h1>
              <p className="section-subtitle">
                Crie novas organizações, atualize informações e controle quais usuários fazem parte de cada
                equipe.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={handleStartCreate}>
              Nova organização
            </Button>
          </div>

          {isLoading ? (
            <p className="section-subtitle">Carregando organizações do Firestore...</p>
          ) : organizations.length === 0 ? (
            <p className="section-subtitle">
              Nenhuma organização cadastrada até o momento. Crie a primeira utilizando o botão acima.
            </p>
          ) : (
            <ul className="organization-list">
              {organizations.map((organization) => {
                const isActive = organization.id === selectedOrganizationId && !isCreatingNew;
                return (
                  <li key={organization.id} className={`organization-list-item${isActive ? ' organization-list-item--active' : ''}`}>
                    <button
                      type="button"
                      className="organization-list-item-button"
                      onClick={() => handleSelectOrganization(organization.id)}
                    >
                      <div>
                        <h3>{organization.name}</h3>
                        <span>
                          {organization.members.length}{' '}
                          membro{organization.members.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p>{organization.description || 'Sem descrição cadastrada.'}</p>
                    </button>
                    <button
                      type="button"
                      className="organization-list-item-delete"
                      onClick={() => handleDeleteOrganization(organization.id)}
                      disabled={isSavingOrganization}
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card organization-admin-details">
          {isCreatingNew ? (
            <>
              <h2 className="text-xl font-semibold text-primary">Cadastrar nova organização</h2>
              <p className="section-subtitle">
                Preencha as informações abaixo para disponibilizar uma nova organização no QaLite.
              </p>
              {formError && <p className="form-message form-message--error">{formError}</p>}
              <form className="form-grid" onSubmit={handleOrganizationSubmit}>
                <TextInput
                  id="organization-name"
                  label="Nome da organização"
                  value={organizationForm.name}
                  onChange={(event) => setOrganizationForm((previous) => ({
                    ...previous,
                    name: event.target.value
                  }))}
                  placeholder="Ex.: Squad de Onboarding"
                  required
                />
                <TextArea
                  id="organization-description"
                  label="Descrição"
                  value={organizationForm.description}
                  onChange={(event) => setOrganizationForm((previous) => ({
                    ...previous,
                    description: event.target.value
                  }))}
                  placeholder="Resuma o objetivo principal desta organização"
                />
                <Button type="submit" isLoading={isSavingOrganization} loadingText="Salvando...">
                  Criar organização
                </Button>
              </form>
            </>
          ) : selectedOrganization ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-primary">{selectedOrganization.name}</h2>
                  <p className="section-subtitle">Atualize detalhes e gerencie membros desta organização.</p>
                </div>
                <span className="badge">
                  {selectedOrganization.members.length} membro
                  {selectedOrganization.members.length === 1 ? '' : 's'}
                </span>
              </div>

              {formError && <p className="form-message form-message--error">{formError}</p>}
              <form className="form-grid" onSubmit={handleOrganizationSubmit}>
                <TextInput
                  id="edit-organization-name"
                  label="Nome da organização"
                  value={organizationForm.name}
                  onChange={(event) => setOrganizationForm((previous) => ({
                    ...previous,
                    name: event.target.value
                  }))}
                  required
                />
                <TextArea
                  id="edit-organization-description"
                  label="Descrição"
                  value={organizationForm.description}
                  onChange={(event) => setOrganizationForm((previous) => ({
                    ...previous,
                    description: event.target.value
                  }))}
                />
                <Button type="submit" isLoading={isSavingOrganization} loadingText="Salvando...">
                  Salvar alterações
                </Button>
              </form>

              <div className="organization-members">
                <h3>Membros vinculados</h3>
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

                {selectedOrganization.members.length === 0 ? (
                  <p className="section-subtitle">
                    Nenhum usuário vinculado ainda. Adicione membros utilizando o e-mail cadastrado no QaLite.
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
            </>
          ) : (
            <div className="organization-empty">
              <h2 className="text-xl font-semibold text-primary">Selecione uma organização</h2>
              <p className="section-subtitle">
                Escolha uma organização na lista ao lado ou crie uma nova para começar a gerenciar membros.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};
