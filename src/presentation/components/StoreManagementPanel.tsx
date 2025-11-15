import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import type { Store, StoreScenario, StoreScenarioInput } from '../../domain/entities/Store';
import type { StoreExportPayload } from '../../application/services/StoreService';
import { storeService } from '../../application/services/StoreService';
import { useToast } from '../context/ToastContext';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';

interface StoreManagementPanelProps {
  organizationId: string;
  organizationName: string;
  canManageStores: boolean;
  canManageScenarios: boolean;
}

const emptyScenarioForm: StoreScenarioInput = {
  title: '',
  category: '',
  automation: '',
  criticality: '',
  observation: '',
  bdd: ''
};

export const StoreManagementPanel = ({
  organizationId,
  organizationName,
  canManageStores,
  canManageScenarios
}: StoreManagementPanelProps) => {
  const { showToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storeFormMode, setStoreFormMode] = useState<'hidden' | 'create' | 'edit'>('hidden');
  const [storeForm, setStoreForm] = useState({ name: '', site: '', stage: '' });
  const [storeFormError, setStoreFormError] = useState<string | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [scenarioForm, setScenarioForm] = useState<StoreScenarioInput>(emptyScenarioForm);
  const [scenarioFormError, setScenarioFormError] = useState<string | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const data = await storeService.listByOrganization(organizationId);
        setStores(data);
        if (data.length > 0) {
          setSelectedStoreId((previous) => previous ?? data[0].id);
        } else {
          setSelectedStoreId(null);
          setScenarios([]);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as lojas desta organização.' });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [organizationId, showToast]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, stores]
  );

  useEffect(() => {
    if (!selectedStore) {
      setScenarios([]);
      return;
    }

    const fetchScenarios = async () => {
      try {
        setIsLoadingScenarios(true);
        const data = await storeService.listScenarios(selectedStore.id);
        setScenarios(data);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar a massa de cenários desta loja.' });
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    void fetchScenarios();
  }, [selectedStore, showToast]);

  const resetStoreForm = () => {
    setStoreForm({ name: '', site: '', stage: '' });
    setStoreFormMode('hidden');
    setStoreFormError(null);
  };

  const handleStartCreateStore = () => {
    setStoreForm({ name: '', site: '', stage: '' });
    setStoreFormMode('create');
    setStoreFormError(null);
  };

  const handleStartEditStore = (store: Store) => {
    setStoreForm({ name: store.name, site: store.site, stage: store.stage });
    setStoreFormMode('edit');
    setStoreFormError(null);
    setSelectedStoreId(store.id);
  };

  const handleStoreFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreFormError(null);

    if (!canManageStores) {
      return;
    }

    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();
    const trimmedStage = storeForm.stage.trim();

    if (!trimmedName) {
      setStoreFormError('Informe um nome para a loja.');
      return;
    }

    if (!trimmedSite) {
      setStoreFormError('Informe o site ou contexto da loja.');
      return;
    }

    try {
      setIsSavingStore(true);
      if (storeFormMode === 'create') {
        const created = await storeService.create({
          organizationId,
          name: trimmedName,
          site: trimmedSite,
          stage: trimmedStage
        });

        setStores((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedStoreId(created.id);
        resetStoreForm();
        showToast({ type: 'success', message: 'Loja criada com sucesso.' });
        return;
      }

      if (storeFormMode === 'edit' && selectedStore) {
        const updated = await storeService.update(selectedStore.id, {
          name: trimmedName,
          site: trimmedSite,
          stage: trimmedStage
        });

        setStores((previous) =>
          previous
            .map((store) => (store.id === updated.id ? { ...updated, scenarioCount: store.scenarioCount } : store))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        showToast({ type: 'success', message: 'Loja atualizada com sucesso.' });
        resetStoreForm();
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a loja.';
      setStoreFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleDeleteStore = async (store: Store) => {
    if (!canManageStores) {
      return;
    }

    const confirmation = window.confirm(
      `Deseja remover a loja "${store.name}"? Todos os cenários vinculados serão excluídos.`
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsSavingStore(true);
      await storeService.delete(store.id);
      setStores((previous) => {
        const remaining = previous.filter((item) => item.id !== store.id);
        if (selectedStoreId === store.id) {
          if (remaining.length > 0) {
            setSelectedStoreId(remaining[0].id);
          } else {
            setSelectedStoreId(null);
            setScenarios([]);
          }
        }
        return remaining;
      });
      showToast({ type: 'success', message: 'Loja removida com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover a loja.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleScenarioFormChange = (field: keyof StoreScenarioInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setScenarioForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleScenarioSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScenarioFormError(null);

    if (!selectedStore || !canManageScenarios) {
      return;
    }

    const trimmedScenario: StoreScenarioInput = {
      title: scenarioForm.title.trim(),
      category: scenarioForm.category.trim(),
      automation: scenarioForm.automation.trim(),
      criticality: scenarioForm.criticality.trim(),
      observation: scenarioForm.observation.trim(),
      bdd: scenarioForm.bdd.trim()
    };

    const hasEmptyField = Object.values(trimmedScenario).some((value) => value === '');
    if (hasEmptyField) {
      setScenarioFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSavingScenario(true);
      if (editingScenarioId) {
        const updated = await storeService.updateScenario(selectedStore.id, editingScenarioId, trimmedScenario);
        setScenarios((previous) => previous.map((scenario) => (scenario.id === updated.id ? updated : scenario)));
        showToast({ type: 'success', message: 'Cenário atualizado com sucesso.' });
      } else {
        const created = await storeService.createScenario({ storeId: selectedStore.id, ...trimmedScenario });
        setScenarios((previous) => [...previous, created]);
        setStores((previous) =>
          previous.map((store) =>
            store.id === selectedStore.id
              ? { ...store, scenarioCount: store.scenarioCount + 1 }
              : store
          )
        );
        showToast({ type: 'success', message: 'Cenário adicionado com sucesso.' });
      }

      setScenarioForm(emptyScenarioForm);
      setEditingScenarioId(null);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o cenário.';
      setScenarioFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleEditScenario = (scenario: StoreScenario) => {
    if (!canManageScenarios) {
      return;
    }

    setScenarioForm({
      title: scenario.title,
      category: scenario.category,
      automation: scenario.automation,
      criticality: scenario.criticality,
      observation: scenario.observation,
      bdd: scenario.bdd
    });
    setEditingScenarioId(scenario.id);
    setScenarioFormError(null);
  };

  const handleDeleteScenario = async (scenario: StoreScenario) => {
    if (!canManageScenarios || !selectedStore) {
      return;
    }

    const confirmation = window.confirm(`Deseja remover o cenário "${scenario.title}"?`);
    if (!confirmation) {
      return;
    }

    try {
      setIsSavingScenario(true);
      await storeService.deleteScenario(selectedStore.id, scenario.id);
      setScenarios((previous) => previous.filter((item) => item.id !== scenario.id));
      setStores((previous) =>
        previous.map((store) =>
          store.id === selectedStore.id
            ? { ...store, scenarioCount: Math.max(store.scenarioCount - 1, 0) }
            : store
        )
      );
      showToast({ type: 'success', message: 'Cenário removido com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover o cenário.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleExport = async () => {
    if (!selectedStore) {
      return;
    }

    try {
      setIsExporting(true);
      const data = await storeService.exportStore(selectedStore.id);
      downloadJsonFile(data, `${selectedStore.name.replace(/\s+/g, '_')}_cenarios.json`);
      showToast({ type: 'success', message: 'Exportação concluída com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível exportar os cenários.';
      showToast({ type: 'error', message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (!selectedStore || !canManageScenarios) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !selectedStore) {
      return;
    }

    try {
      setIsImporting(true);
      const content = await file.text();
      const parsed = JSON.parse(content) as StoreExportPayload;

      validateImportPayload(parsed);

      const importedStoreName = parsed.store.name.trim().toLowerCase();
      const selectedStoreName = selectedStore.name.trim().toLowerCase();

      if (parsed.store.id && parsed.store.id !== selectedStore.id && importedStoreName !== selectedStoreName) {
        throw new Error('O arquivo selecionado pertence a outra loja.');
      }

      if (parsed.scenarios.length === 0) {
        showToast({ type: 'info', message: 'Nenhum cenário encontrado para importar.' });
        return;
      }

      const shouldReplace = window.confirm(
        'Deseja sobrescrever os cenários atuais? Clique em Cancelar para mesclar com os existentes.'
      );

      const strategy = shouldReplace ? 'replace' : 'merge';
      const scenariosPayload = parsed.scenarios.map((scenario) => ({
        title: scenario.title,
        category: scenario.category,
        automation: scenario.automation,
        criticality: scenario.criticality,
        observation: scenario.observation,
        bdd: scenario.bdd
      }));

      const result = await storeService.importScenarios(selectedStore.id, scenariosPayload, strategy);
      setScenarios(result.scenarios);
      setStores((previous) =>
        previous.map((store) =>
          store.id === selectedStore.id
            ? { ...store, scenarioCount: result.scenarios.length }
            : store
        )
      );

      const feedbackMessage =
        result.strategy === 'replace'
          ? `Cenários substituídos com sucesso (${result.scenarios.length} itens).`
          : `Importação concluída. ${result.created} novo(s) cenário(s) adicionados, ${result.skipped} ignorados.`;

      showToast({ type: 'success', message: feedbackMessage });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível importar o arquivo selecionado.';
      showToast({ type: 'error', message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="store-management">
      <div className="card store-management-sidebar">
        <div className="store-management-header">
          <div>
            <h2 className="text-xl font-semibold text-primary">Lojas da organização</h2>
            <p className="section-subtitle">
              {organizationName} possui {stores.length}{' '}
              loja{stores.length === 1 ? '' : 's'} cadastrada{stores.length === 1 ? '' : 's'}.
            </p>
          </div>
          {canManageStores && (
            <Button type="button" variant="secondary" onClick={handleStartCreateStore}>
              Nova loja
            </Button>
          )}
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">Carregando lojas cadastradas...</p>
        ) : stores.length === 0 ? (
          <p className="section-subtitle">
            Nenhuma loja foi cadastrada ainda. {canManageStores ? 'Crie a primeira loja para começar.' : 'Aguarde um administrador cadastrar uma loja.'}
          </p>
        ) : (
          <ul className="store-list">
            {stores.map((store) => {
              const isActive = store.id === selectedStoreId;
              return (
                <li key={store.id} className={`store-list-item${isActive ? ' store-list-item--active' : ''}`}>
                  <button type="button" className="store-list-button" onClick={() => setSelectedStoreId(store.id)}>
                    <div className="store-list-meta">
                      <h3>{store.name}</h3>
                      <span>{store.stage || 'Sem estágio definido'}</span>
                    </div>
                    <p>{store.site}</p>
                    <span className="store-list-count">
                      {store.scenarioCount} cenário{store.scenarioCount === 1 ? '' : 's'}
                    </span>
                  </button>
                  {canManageStores && (
                    <div className="store-list-actions">
                      <button type="button" onClick={() => handleStartEditStore(store)} disabled={isSavingStore}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteStore(store)}
                        disabled={isSavingStore}
                        className="store-list-delete"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canManageStores && storeFormMode !== 'hidden' && (
          <form className="form-grid" onSubmit={handleStoreFormSubmit}>
            <h3 className="form-title">{storeFormMode === 'create' ? 'Cadastrar loja' : 'Editar loja'}</h3>
            {storeFormError && <p className="form-message form-message--error">{storeFormError}</p>}
            <TextInput
              id="store-name"
              label="Nome"
              value={storeForm.name}
              onChange={(event) => setStoreForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Ex.: Loja Centro"
              required
            />
            <TextInput
              id="store-site"
              label="Site / Ambiente"
              value={storeForm.site}
              onChange={(event) => setStoreForm((previous) => ({ ...previous, site: event.target.value }))}
              placeholder="Ex.: https://minhaloja.com"
              required
            />
            <TextInput
              id="store-stage"
              label="Estágio"
              value={storeForm.stage}
              onChange={(event) => setStoreForm((previous) => ({ ...previous, stage: event.target.value }))}
              placeholder="Ex.: Produção"
            />
            <div className="store-form-actions">
              <Button type="submit" isLoading={isSavingStore} loadingText="Salvando...">
                {storeFormMode === 'create' ? 'Salvar loja' : 'Atualizar loja'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetStoreForm} disabled={isSavingStore}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="card store-management-content">
        {selectedStore ? (
          <>
            <div className="store-details">
              <div>
                <h2 className="text-xl font-semibold text-primary">{selectedStore.name}</h2>
                <p className="section-subtitle">
                  {selectedStore.stage ? `${selectedStore.stage} • ` : ''}
                  {selectedStore.site}
                </p>
              </div>
              <div className="store-details-actions">
                <Button type="button" variant="ghost" onClick={handleExport} isLoading={isExporting} loadingText="Exportando...">
                  Exportar JSON
                </Button>
                {canManageScenarios && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleImportClick}
                    isLoading={isImporting}
                    loadingText="Importando..."
                  >
                    Importar JSON
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </div>

            {canManageScenarios && (
              <form className="scenario-form" onSubmit={handleScenarioSubmit}>
                <h3 className="form-title">{editingScenarioId ? 'Editar cenário' : 'Novo cenário'}</h3>
                {scenarioFormError && <p className="form-message form-message--error">{scenarioFormError}</p>}
                <TextInput
                  id="scenario-title"
                  label="Título"
                  value={scenarioForm.title}
                  onChange={handleScenarioFormChange('title')}
                  required
                />
                <div className="scenario-form-grid">
                  <TextInput
                    id="scenario-category"
                    label="Categoria"
                    value={scenarioForm.category}
                    onChange={handleScenarioFormChange('category')}
                    required
                  />
                  <TextInput
                    id="scenario-automation"
                    label="Automação"
                    value={scenarioForm.automation}
                    onChange={handleScenarioFormChange('automation')}
                    required
                  />
                  <TextInput
                    id="scenario-criticality"
                    label="Criticidade"
                    value={scenarioForm.criticality}
                    onChange={handleScenarioFormChange('criticality')}
                    required
                  />
                </div>
                <TextArea
                  id="scenario-observation"
                  label="Observação"
                  value={scenarioForm.observation}
                  onChange={handleScenarioFormChange('observation')}
                  required
                />
                <TextArea
                  id="scenario-bdd"
                  label="BDD"
                  value={scenarioForm.bdd}
                  onChange={handleScenarioFormChange('bdd')}
                  required
                />
                <div className="scenario-form-actions">
                  <Button type="submit" isLoading={isSavingScenario} loadingText="Salvando...">
                    {editingScenarioId ? 'Atualizar cenário' : 'Adicionar cenário'}
                  </Button>
                  {editingScenarioId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setScenarioForm(emptyScenarioForm);
                        setEditingScenarioId(null);
                      }}
                      disabled={isSavingScenario}
                    >
                      Cancelar edição
                    </Button>
                  )}
                </div>
              </form>
            )}

            <div className="scenario-table-wrapper">
              {isLoadingScenarios ? (
                <p className="section-subtitle">Carregando cenários cadastrados...</p>
              ) : scenarios.length === 0 ? (
                <p className="section-subtitle">
                  Nenhum cenário cadastrado para esta loja ainda. {canManageScenarios ? 'Cadastre o primeiro utilizando o formulário acima.' : 'Aguarde um responsável cadastrar os cenários.'}
                </p>
              ) : (
                <table className="scenario-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Categoria</th>
                      <th>Automação</th>
                      <th>Criticidade</th>
                      <th>Observação</th>
                      <th>BDD</th>
                      {canManageScenarios && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((scenario) => (
                      <tr key={scenario.id}>
                        <td>{scenario.title}</td>
                        <td>{scenario.category}</td>
                        <td>{scenario.automation}</td>
                        <td>{scenario.criticality}</td>
                        <td className="scenario-observation">{scenario.observation}</td>
                        <td className="scenario-bdd">{scenario.bdd}</td>
                        {canManageScenarios && (
                          <td className="scenario-actions">
                            <button type="button" onClick={() => handleEditScenario(scenario)} disabled={isSavingScenario}>
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteScenario(scenario)}
                              disabled={isSavingScenario}
                              className="scenario-delete"
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="store-empty">
            <h2 className="text-xl font-semibold text-primary">Selecione uma loja para continuar</h2>
            <p className="section-subtitle">
              {canManageStores
                ? 'Escolha uma loja na lista ao lado ou cadastre uma nova para gerenciar os cenários.'
                : 'Solicite a um administrador o cadastro de lojas para visualizar os cenários disponíveis.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

const downloadJsonFile = (data: StoreExportPayload, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const validateImportPayload = (payload: StoreExportPayload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Arquivo inválido.');
  }

  if (!payload.store || typeof payload.store !== 'object') {
    throw new Error('Arquivo não possui informações da loja.');
  }

  const requiredStoreFields: (keyof StoreExportPayload['store'])[] = ['id', 'name', 'site', 'stage', 'scenarioCount'];
  requiredStoreFields.forEach((field) => {
    if (field === 'scenarioCount') {
      if (typeof payload.store.scenarioCount !== 'number') {
        throw new Error('Quantidade de cenários inválida.');
      }
      return;
    }

    if (typeof payload.store[field] !== 'string') {
      throw new Error('Dados da loja estão incompletos.');
    }
  });

  if (!Array.isArray(payload.scenarios)) {
    throw new Error('Estrutura de cenários inválida.');
  }

  payload.scenarios.forEach((scenario) => {
    const requiredScenarioFields: (keyof StoreScenario)[] = [
      'title',
      'category',
      'automation',
      'criticality',
      'observation',
      'bdd'
    ];

    requiredScenarioFields.forEach((field) => {
      const value = scenario[field];
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Cenário inválido. O campo "${field}" é obrigatório.`);
      }
    });
  });
};
