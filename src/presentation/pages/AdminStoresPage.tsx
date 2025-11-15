import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import type { Store } from '../../domain/entities/Store';
import { organizationService } from '../../application/services/OrganizationService';
import { storeService } from '../../application/services/StoreService';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { SelectInput } from '../components/SelectInput';
import { Modal } from '../components/Modal';

interface StoreForm {
  name: string;
  site: string;
  stage: string;
}

const initialStoreForm: StoreForm = {
  name: '',
  site: '',
  stage: ''
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
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true);
        const data = await organizationService.list();
        setOrganizations(data);
        const organizationFromParam = searchParams.get('organizationId');
        const hasValidOrganizationParam = Boolean(
          organizationFromParam && data.some((item) => item.id === organizationFromParam)
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
        showToast({ type: 'error', message: 'Não foi possível carregar as lojas desta organização.' });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [selectedOrganizationId, setSearchParams, showToast]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  );

  const openCreateModal = () => {
    setStoreForm(initialStoreForm);
    setCurrentStore(null);
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setStoreForm({ name: store.name, site: store.site, stage: store.stage });
    setCurrentStore(store);
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const closeStoreModal = () => {
    setIsStoreModalOpen(false);
    setStoreForm(initialStoreForm);
    setCurrentStore(null);
    setStoreError(null);
  };

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreError(null);

    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();
    const trimmedStage = storeForm.stage.trim();

    if (!selectedOrganizationId) {
      setStoreError('Selecione uma organização antes de cadastrar a loja.');
      return;
    }

    if (!trimmedName) {
      setStoreError('Informe o nome da loja.');
      return;
    }

    try {
      setIsSavingStore(true);

      if (currentStore) {
        const updated = await storeService.update(currentStore.id, {
          name: trimmedName,
          site: trimmedSite,
          stage: trimmedStage
        });

        setStores((previous) => previous.map((store) => (store.id === updated.id ? updated : store)));
        showToast({ type: 'success', message: 'Loja atualizada com sucesso.' });
        setCurrentStore(updated);
        return;
      }

      const created = await storeService.create({
        organizationId: selectedOrganizationId,
        name: trimmedName,
        site: trimmedSite,
        stage: trimmedStage
      });

      setStores((previous) => [...previous, created]);
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

  const handleDeleteStore = async (storeId: string) => {
    const store = stores.find((item) => item.id === storeId);
    if (!store) {
      return;
    }

    const confirmation = window.confirm(`Deseja remover a loja "${store.name}"?`);
    if (!confirmation) {
      return;
    }

    try {
      setIsSavingStore(true);
      await storeService.delete(storeId);
      setStores((previous) => previous.filter((item) => item.id !== storeId));
      showToast({ type: 'success', message: 'Loja removida com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover a loja.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
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
                <span className="badge">{selectedOrganization?.name ?? 'Organização selecionada'}</span>
              </div>
            ) : (
              <SelectInput
                id="organization-selector"
                label="Organização"
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
                options={organizations.map((organization) => ({
                  value: organization.id,
                  label: organization.name
                }))}
                disabled={isLoadingOrganizations || organizations.length === 0}
              />
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
              <div key={store.id} className="card">
                <div className="card-header">
                  <h2 className="card-title">{store.name}</h2>
                  <span className="badge">{store.scenarioCount} cenários</span>
                </div>
                <p className="card-description">
                  <span>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </span>
                  <span>
                    <strong>Ambiente:</strong> {store.stage || 'Não informado'}
                  </span>
                  <span>
                    <strong>Organização:</strong> {selectedOrganization?.name ?? 'Desconhecida'}
                  </span>
                </p>
                <div className="card-actions">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/stores/${store.id}`)}>
                    Entrar na loja
                  </Button>
                  <Button type="button" onClick={() => openEditModal(store)}>
                    Editar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void handleDeleteStore(store.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isStoreModalOpen}
        onClose={closeStoreModal}
        title={currentStore ? 'Editar loja' : 'Nova loja'}
        description="Informe os dados básicos da loja para disponibilizar os cenários."
      >
        {storeError && <p className="form-message form-message--error">{storeError}</p>}
        <form className="form-grid" onSubmit={handleStoreSubmit}>
          <TextInput
            id="store-name"
            label="Nome da loja"
            value={storeForm.name}
            onChange={(event) => setStoreForm((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="Ex.: Loja QA"
            required
          />
          <TextInput
            id="store-site"
            label="URL do site"
            value={storeForm.site}
            onChange={(event) => setStoreForm((previous) => ({ ...previous, site: event.target.value }))}
            placeholder="https://minhaloja.com"
          />
          <TextInput
            id="store-stage"
            label="Ambiente"
            value={storeForm.stage}
            onChange={(event) => setStoreForm((previous) => ({ ...previous, stage: event.target.value }))}
            placeholder="Produção, Staging, etc."
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isSavingStore} loadingText="Salvando...">
              {currentStore ? 'Salvar alterações' : 'Criar loja'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeStoreModal} disabled={isSavingStore}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
