import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import type {
  Store,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
} from '../../domain/entities/Store';
import { organizationService } from '../../main/factories/organizationServiceFactory';
import { storeService } from '../../main/factories/storeServiceFactory';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { SelectInput } from '../components/SelectInput';
import {
  AUTOMATION_OPTIONS,
  CRITICALITY_OPTIONS,
  getCriticalityClassName,
} from '../constants/scenarioOptions';
import { KanbanAmbientes } from '../components/environments/KanbanAmbientes';

const emptyScenarioForm: StoreScenarioInput = {
  title: '',
  category: '',
  automation: '',
  criticality: '',
  observation: '',
  bdd: '',
};

const emptySuiteForm: StoreSuiteInput = {
  name: '',
  description: '',
  scenarioIds: [],
};

interface ScenarioFilters {
  search: string;
  category: string;
  criticality: string;
}

const emptyScenarioFilters: ScenarioFilters = {
  search: '',
  category: '',
  criticality: '',
};

const filterScenarios = (list: StoreScenario[], filters: ScenarioFilters) => {
  const searchValue = filters.search.trim().toLowerCase();
  return list.filter((scenario) => {
    const matchesSearch = !searchValue || scenario.title.toLowerCase().includes(searchValue);
    const matchesCategory = !filters.category || scenario.category === filters.category;
    const matchesCriticality = !filters.criticality || scenario.criticality === filters.criticality;
    return matchesSearch && matchesCategory && matchesCriticality;
  });
};

export const StoreSummaryPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();

  const [store, setStore] = useState<Store | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [suites, setSuites] = useState<StoreSuite[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [isLoadingSuites, setIsLoadingSuites] = useState(true);
  const [scenarioForm, setScenarioForm] = useState<StoreScenarioInput>(emptyScenarioForm);
  const [scenarioFormError, setScenarioFormError] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isScenarioTableCollapsed, setIsScenarioTableCollapsed] = useState(false);
  const [suiteForm, setSuiteForm] = useState<StoreSuiteInput>(emptySuiteForm);
  const [suiteFormError, setSuiteFormError] = useState<string | null>(null);
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  const [isSavingSuite, setIsSavingSuite] = useState(false);
  const [viewMode, setViewMode] = useState<'scenarios' | 'suites'>('scenarios');
  const [scenarioFilters, setScenarioFilters] = useState<ScenarioFilters>(emptyScenarioFilters);
  const [suiteScenarioFilters, setSuiteScenarioFilters] =
    useState<ScenarioFilters>(emptyScenarioFilters);
  const [selectedSuitePreviewId, setSelectedSuitePreviewId] = useState<string | null>(null);
  const [isViewingSuitesOnly, setIsViewingSuitesOnly] = useState(false);
  const suiteListRef = useRef<HTMLDivElement | null>(null);
  const selectedSuiteScenarioCount = suiteForm.scenarioIds.length;
  const suiteSelectionSummary =
    selectedSuiteScenarioCount === 0
      ? 'Nenhum cenário selecionado ainda.'
      : `${selectedSuiteScenarioCount} cenário${selectedSuiteScenarioCount === 1 ? '' : 's'} selecionado${selectedSuiteScenarioCount === 1 ? '' : 's'}.`;

  const canManageScenarios = Boolean(user);

  const scenarioMap = useMemo(() => {
    const map = new Map<string, StoreScenario>();
    scenarios.forEach((scenario) => {
      map.set(scenario.id, scenario);
    });
    return map;
  }, [scenarios]);

  const scenarioCategories = useMemo(
    () =>
      new Set(
        scenarios
          .map((scenario) => scenario.category.trim())
          .filter((category) => category.length > 0),
      ),
    [scenarios],
  );

  const availableCategories = useMemo(() => {
    const fromScenarios = Array.from(scenarioCategories);
    const combined = new Set([...fromScenarios, ...customCategories]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [customCategories, scenarioCategories]);

  const categorySelectOptions = useMemo(() => {
    if (availableCategories.length === 0) {
      return [{ value: '', label: 'Cadastre uma categoria para começar' }];
    }

    return [
      { value: '', label: 'Selecione uma categoria' },
      ...availableCategories.map((category) => ({ value: category, label: category })),
    ];
  }, [availableCategories]);

  const automationSelectOptions = useMemo(
    () => [{ value: '', label: 'Selecione o tipo de automação' }, ...AUTOMATION_OPTIONS],
    [],
  );

  const criticalitySelectOptions = useMemo(
    () => [{ value: '', label: 'Selecione a criticidade' }, ...CRITICALITY_OPTIONS],
    [],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: '', label: 'Todas as categorias' },
      ...availableCategories.map((category) => ({ value: category, label: category })),
    ],
    [availableCategories],
  );

  const criticalityFilterOptions = useMemo(
    () => [{ value: '', label: 'Todas as criticidades' }, ...CRITICALITY_OPTIONS],
    [],
  );

  const filteredScenarios = useMemo(
    () => filterScenarios(scenarios, scenarioFilters),
    [scenarioFilters, scenarios],
  );

  const filteredSuiteScenarios = useMemo(
    () => filterScenarios(scenarios, suiteScenarioFilters),
    [scenarios, suiteScenarioFilters],
  );

  const selectedSuitePreview = useMemo(
    () => suites.find((suite) => suite.id === selectedSuitePreviewId) ?? null,
    [selectedSuitePreviewId, suites],
  );

  const selectedSuitePreviewEntries = useMemo(() => {
    if (!selectedSuitePreview) {
      return [];
    }

    return selectedSuitePreview.scenarioIds.map((scenarioId) => ({
      scenarioId,
      scenario: scenarioMap.get(scenarioId) ?? null,
    }));
  }, [scenarioMap, selectedSuitePreview]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!storeId) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoadingStore(true);
        setIsLoadingScenarios(true);

        const data = await storeService.getById(storeId);

        if (!data) {
          showToast({ type: 'error', message: 'Loja não encontrada.' });
          navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
          return;
        }

        if (user.role !== 'admin' && user.organizationId !== data.organizationId) {
          showToast({ type: 'error', message: 'Você não tem permissão para acessar esta loja.' });
          navigate('/dashboard', { replace: true });
          return;
        }

        setStore(data);

        const [organizationData, scenariosData] = await Promise.all([
          organizationService.getById(data.organizationId),
          storeService.listScenarios(data.id),
        ]);

        if (organizationData) {
          setOrganization(organizationData);
        }
        setScenarios(scenariosData);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar os detalhes da loja.' });
      } finally {
        setIsLoadingStore(false);
        setIsLoadingScenarios(false);
      }
    };

    void fetchData();
  }, [isInitializing, navigate, showToast, storeId, user]);

  useEffect(() => {
    if (scenarios.length === 0) {
      setIsScenarioTableCollapsed(false);
    }
  }, [scenarios.length]);

  useEffect(() => {
    setCustomCategories([]);
    setNewCategoryName('');
    setCategoryError(null);
  }, [storeId]);

  useEffect(() => {
    setSuiteForm(emptySuiteForm);
    setSuiteFormError(null);
    setEditingSuiteId(null);
    setViewMode('scenarios');
    setScenarioFilters(emptyScenarioFilters);
    setSuiteScenarioFilters(emptyScenarioFilters);
    setSelectedSuitePreviewId(null);
  }, [storeId]);

  useEffect(() => {
    if (!storeId || !user) {
      setSuites([]);
      setIsLoadingSuites(false);
      return;
    }

    let isMounted = true;

    const fetchSuites = async () => {
      try {
        setIsLoadingSuites(true);
        const suitesData = await storeService.listSuites(storeId);
        if (isMounted) {
          setSuites(suitesData);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          showToast({ type: 'error', message: 'Não foi possível carregar as suítes de testes.' });
        }
      } finally {
        if (isMounted) {
          setIsLoadingSuites(false);
        }
      }
    };

    void fetchSuites();

    return () => {
      isMounted = false;
    };
  }, [showToast, storeId, user]);

  useEffect(() => {
    setSuiteForm((previous) => {
      const filteredScenarioIds = previous.scenarioIds.filter((scenarioId) =>
        scenarioMap.has(scenarioId),
      );

      if (filteredScenarioIds.length === previous.scenarioIds.length) {
        return previous;
      }

      return { ...previous, scenarioIds: filteredScenarioIds };
    });
  }, [scenarioMap]);

  useEffect(() => {
    if (selectedSuitePreviewId && !suites.some((suite) => suite.id === selectedSuitePreviewId)) {
      setSelectedSuitePreviewId(null);
    }
  }, [selectedSuitePreviewId, suites]);

  const handleScenarioFormChange =
    (field: keyof StoreScenarioInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setScenarioForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryName.trim();
    if (!trimmedCategory) {
      setCategoryError('Informe o nome da nova categoria.');
      return;
    }

    const alreadyExists = availableCategories.some(
      (category) => category.toLowerCase() === trimmedCategory.toLowerCase(),
    );

    if (alreadyExists) {
      setCategoryError('Esta categoria já está disponível.');
      setScenarioForm((previous) => ({ ...previous, category: trimmedCategory }));
      return;
    }

    setCustomCategories((previous) => [...previous, trimmedCategory]);
    setScenarioForm((previous) => ({ ...previous, category: trimmedCategory }));
    setNewCategoryName('');
    setCategoryError(null);
  };

  const handleRemoveCustomCategory = (category: string) => {
    setCustomCategories((previous) => previous.filter((item) => item !== category));
    if (scenarioForm.category === category) {
      setScenarioForm((previous) => ({ ...previous, category: '' }));
    }
  };

  const handleCopyBdd = async (bdd: string) => {
    if (!bdd.trim()) {
      showToast({ type: 'error', message: 'Não há conteúdo de BDD para copiar.' });
      return;
    }

    try {
      if (!navigator?.clipboard) {
        throw new Error('Clipboard API indisponível.');
      }
      await navigator.clipboard.writeText(bdd);
      showToast({ type: 'success', message: 'BDD copiado para a área de transferência.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível copiar o BDD automaticamente.' });
    }
  };

  const handleCancelScenarioEdit = () => {
    setScenarioForm(emptyScenarioForm);
    setEditingScenarioId(null);
    setScenarioFormError(null);
  };

  const handleScenarioSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScenarioFormError(null);

    if (!store || !canManageScenarios) {
      return;
    }

    const trimmedScenario: StoreScenarioInput = {
      title: scenarioForm.title.trim(),
      category: scenarioForm.category.trim(),
      automation: scenarioForm.automation.trim(),
      criticality: scenarioForm.criticality.trim(),
      observation: scenarioForm.observation.trim(),
      bdd: scenarioForm.bdd.trim(),
    };

    const hasEmptyField = Object.values(trimmedScenario).some((value) => value === '');
    if (hasEmptyField) {
      setScenarioFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSavingScenario(true);
      if (editingScenarioId) {
        const updated = await storeService.updateScenario(
          store.id,
          editingScenarioId,
          trimmedScenario,
        );
        setScenarios((previous) =>
          previous.map((scenario) => (scenario.id === updated.id ? updated : scenario)),
        );
        showToast({ type: 'success', message: 'Cenário atualizado com sucesso.' });
      } else {
        const created = await storeService.createScenario({
          storeId: store.id,
          ...trimmedScenario,
        });
        setScenarios((previous) => [...previous, created]);
        setStore((previous) =>
          previous ? { ...previous, scenarioCount: previous.scenarioCount + 1 } : previous,
        );
        showToast({ type: 'success', message: 'Cenário adicionado com sucesso.' });
      }

      handleCancelScenarioEdit();
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
      bdd: scenario.bdd,
    });
    setEditingScenarioId(scenario.id);
    setScenarioFormError(null);
  };

  const handleDeleteScenario = async (scenario: StoreScenario) => {
    if (!store || !canManageScenarios) {
      return;
    }

    const confirmation = window.confirm(`Deseja remover o cenário "${scenario.title}"?`);
    if (!confirmation) {
      return;
    }

    try {
      setIsSavingScenario(true);
      await storeService.deleteScenario(store.id, scenario.id);
      setScenarios((previous) => previous.filter((item) => item.id !== scenario.id));
      setStore((previous) =>
        previous
          ? { ...previous, scenarioCount: Math.max(previous.scenarioCount - 1, 0) }
          : previous,
      );

      if (editingScenarioId === scenario.id) {
        handleCancelScenarioEdit();
      }

      showToast({ type: 'success', message: 'Cenário removido com sucesso.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover o cenário.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleSuiteFormChange =
    (field: keyof Omit<StoreSuiteInput, 'scenarioIds'>) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSuiteForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSuiteScenarioToggle = (scenarioId: string) => {
    setSuiteForm((previous) => {
      const alreadySelected = previous.scenarioIds.includes(scenarioId);
      return {
        ...previous,
        scenarioIds: alreadySelected
          ? previous.scenarioIds.filter((id) => id !== scenarioId)
          : [...previous.scenarioIds, scenarioId],
      };
    });
  };

  const handleCancelSuiteEdit = () => {
    setSuiteForm(emptySuiteForm);
    setSuiteFormError(null);
    setEditingSuiteId(null);
  };

  const handleScrollToSuiteList = () => {
    suiteListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShowSuitesOnly = () => {
    setIsViewingSuitesOnly(true);
    handleScrollToSuiteList();
  };

  const handleBackToSuiteForm = () => {
    setIsViewingSuitesOnly(false);
  };

  const handleScenarioFilterChange =
    (field: keyof ScenarioFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setScenarioFilters((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSuiteScenarioFilterChange =
    (field: keyof ScenarioFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSuiteScenarioFilters((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleClearScenarioFilters = () => {
    setScenarioFilters(emptyScenarioFilters);
  };

  const handleClearSuiteScenarioFilters = () => {
    setSuiteScenarioFilters(emptyScenarioFilters);
  };

  const handleSuiteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuiteFormError(null);

    if (!store || !canManageScenarios) {
      return;
    }

    const trimmedSuite: StoreSuiteInput = {
      name: suiteForm.name.trim(),
      description: suiteForm.description.trim(),
      scenarioIds: [...suiteForm.scenarioIds],
    };

    if (!trimmedSuite.name) {
      setSuiteFormError('Informe o nome da suíte de testes.');
      return;
    }

    if (!trimmedSuite.description) {
      setSuiteFormError('Descreva o objetivo da suíte.');
      return;
    }

    if (trimmedSuite.scenarioIds.length === 0) {
      setSuiteFormError('Selecione ao menos um cenário para compor a suíte.');
      return;
    }

    try {
      setIsSavingSuite(true);
      if (editingSuiteId) {
        const updatedSuite = await storeService.updateSuite(store.id, editingSuiteId, trimmedSuite);
        setSuites((previous) =>
          previous.map((suite) => (suite.id === updatedSuite.id ? updatedSuite : suite)),
        );
        showToast({ type: 'success', message: 'Suíte atualizada com sucesso.' });
      } else {
        const createdSuite = await storeService.createSuite({
          storeId: store.id,
          ...trimmedSuite,
        });
        setSuites((previous) => [...previous, createdSuite]);
        showToast({ type: 'success', message: 'Suíte criada com sucesso.' });
      }

      handleCancelSuiteEdit();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a suíte.';
      setSuiteFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingSuite(false);
    }
  };

  const handleEditSuite = (suite: StoreSuite) => {
    if (!canManageScenarios) {
      return;
    }

    setSuiteForm({
      name: suite.name,
      description: suite.description,
      scenarioIds: suite.scenarioIds,
    });
    setEditingSuiteId(suite.id);
    setSuiteFormError(null);
    setViewMode('suites');
    setSelectedSuitePreviewId(suite.id);
    setIsViewingSuitesOnly(false);
  };

  const handleDeleteSuite = async (suite: StoreSuite) => {
    if (!store || !canManageScenarios) {
      return;
    }

    const confirmation = window.confirm(`Deseja remover a suíte "${suite.name}"?`);
    if (!confirmation) {
      return;
    }

    try {
      setIsSavingSuite(true);
      await storeService.deleteSuite(store.id, suite.id);
      setSuites((previous) => previous.filter((item) => item.id !== suite.id));

      if (editingSuiteId === suite.id) {
        handleCancelSuiteEdit();
      }

      showToast({ type: 'success', message: 'Suíte removida com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover a suíte.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingSuite(false);
    }
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
            >
              &larr; Voltar
            </button>
            <h1 className="section-title">
              {isLoadingStore ? 'Carregando loja...' : (store?.name ?? 'Loja')}
            </h1>
            {store && (
              <p className="section-subtitle">
                {organization?.name ? `${organization.name} • ` : ''}
                {store.site || 'Site não informado'}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          {isLoadingStore ? (
            <p className="section-subtitle">Sincronizando dados da loja...</p>
          ) : !store ? (
            <p className="section-subtitle">Não foi possível encontrar os detalhes desta loja.</p>
          ) : (
            <div className="store-summary">
              <div className="store-summary-meta">
                <div>
                  <span className="badge">Resumo</span>
                  <h2 className="text-xl font-semibold text-primary">Informações gerais</h2>
                </div>
                <div className="store-summary-stats">
                  <span>
                    <strong>Cenários:</strong> {scenarios.length}
                  </span>
                  <span>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </span>
                </div>
              </div>

              <div className="scenario-view-toggle" aria-label="Alternar visualização">
                <span>Visualizar</span>
                <div className="scenario-view-toggle-buttons">
                  <button
                    type="button"
                    className={viewMode === 'scenarios' ? 'is-active' : ''}
                    onClick={() => setViewMode('scenarios')}
                  >
                    Massa de cenários
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'suites' ? 'is-active' : ''}
                    onClick={() => setViewMode('suites')}
                  >
                    Suítes de testes
                  </button>
                </div>
              </div>

              {store && canManageScenarios && viewMode === 'scenarios' && (
                <form className="scenario-form" onSubmit={handleScenarioSubmit}>
                  <h3 className="form-title">
                    {editingScenarioId ? 'Editar cenário' : 'Novo cenário'}
                  </h3>
                  {scenarioFormError && (
                    <p className="form-message form-message--error">{scenarioFormError}</p>
                  )}
                  <TextInput
                    id="scenario-title"
                    label="Título"
                    value={scenarioForm.title}
                    onChange={handleScenarioFormChange('title')}
                    required
                  />
                  <div className="scenario-form-grid">
                    <SelectInput
                      id="scenario-category"
                      label="Categoria"
                      value={scenarioForm.category}
                      onChange={handleScenarioFormChange('category')}
                      options={categorySelectOptions}
                      required
                    />
                    <SelectInput
                      id="scenario-automation"
                      label="Automação"
                      value={scenarioForm.automation}
                      onChange={handleScenarioFormChange('automation')}
                      options={automationSelectOptions}
                      required
                    />
                    <SelectInput
                      id="scenario-criticality"
                      label="Criticidade"
                      value={scenarioForm.criticality}
                      onChange={handleScenarioFormChange('criticality')}
                      options={criticalitySelectOptions}
                      required
                    />
                  </div>
                  <div className="category-manager">
                    <div className="category-manager-header">
                      <p className="field-label">Categorias disponíveis</p>
                      <p className="category-manager-description">
                        Utilize as categorias cadastradas anteriormente ou crie novas opções para
                        manter a massa organizada.
                      </p>
                    </div>
                    <div className="category-manager-actions">
                      <input
                        type="text"
                        className="field-input"
                        placeholder="Informe uma nova categoria"
                        value={newCategoryName}
                        onChange={(event) => {
                          setNewCategoryName(event.target.value);
                          setCategoryError(null);
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={handleAddCategory}>
                        Adicionar categoria
                      </Button>
                    </div>
                    {categoryError && (
                      <p className="form-message form-message--error">{categoryError}</p>
                    )}
                    {availableCategories.length > 0 ? (
                      <ul className="category-chip-list">
                        {availableCategories.map((category) => (
                          <li key={category} className="category-chip">
                            <span>{category}</span>
                            {!scenarioCategories.has(category) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomCategory(category)}
                                className="category-chip-remove"
                                aria-label={`Remover categoria ${category}`}
                              >
                                &times;
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="category-manager-empty">Nenhuma categoria cadastrada ainda.</p>
                    )}
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
                        onClick={handleCancelScenarioEdit}
                        disabled={isSavingScenario}
                      >
                        Cancelar edição
                      </Button>
                    )}
                  </div>
                </form>
              )}

              <div className="scenario-table-header">
                <div>
                  <h3 className="section-subtitle">Massa de cenários e suítes de testes</h3>
                  <p className="scenario-table-description">
                    Monte agrupamentos customizados a partir dos cenários cadastrados e navegue
                    entre as visualizações.
                  </p>
                </div>
                {viewMode === 'scenarios' && scenarios.length > 0 && (
                  <button
                    type="button"
                    className="scenario-table-toggle"
                    onClick={() => setIsScenarioTableCollapsed((previous) => !previous)}
                  >
                    {isScenarioTableCollapsed ? 'Maximizar tabela' : 'Minimizar tabela'}
                  </button>
                )}
              </div>
              <div className="scenario-table-wrapper">
                {viewMode === 'scenarios' ? (
                  isScenarioTableCollapsed ? (
                    <p className="section-subtitle">
                      Tabela minimizada. Utilize o botão acima para visualizar os cenários
                      novamente.
                    </p>
                  ) : isLoadingScenarios ? (
                    <p className="section-subtitle">Carregando massa de cenários...</p>
                  ) : scenarios.length === 0 ? (
                    <p className="section-subtitle">
                      {canManageScenarios
                        ? 'Nenhum cenário cadastrado para esta loja ainda. Utilize o formulário acima para criar o primeiro.'
                        : 'Nenhum cenário cadastrado para esta loja ainda. Solicite a um responsável a criação da massa de testes.'}
                    </p>
                  ) : (
                    <>
                      <div className="scenario-filter-bar">
                        <input
                          type="text"
                          className="scenario-filter-input"
                          placeholder="Busque pelo título do cenário"
                          value={scenarioFilters.search}
                          onChange={handleScenarioFilterChange('search')}
                          aria-label="Buscar cenários por título"
                        />
                        <select
                          className="scenario-filter-input"
                          value={scenarioFilters.category}
                          onChange={handleScenarioFilterChange('category')}
                          aria-label="Filtrar por categoria"
                        >
                          {categoryFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="scenario-filter-input"
                          value={scenarioFilters.criticality}
                          onChange={handleScenarioFilterChange('criticality')}
                          aria-label="Filtrar por criticidade"
                        >
                          {criticalityFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {(scenarioFilters.search ||
                          scenarioFilters.category ||
                          scenarioFilters.criticality) && (
                          <button
                            type="button"
                            className="scenario-filter-clear"
                            onClick={handleClearScenarioFilters}
                          >
                            Limpar filtros
                          </button>
                        )}
                      </div>
                      {filteredScenarios.length === 0 ? (
                        <p className="section-subtitle">
                          Nenhum cenário corresponde aos filtros aplicados.
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
                            {filteredScenarios.map((scenario) => (
                              <tr key={scenario.id}>
                                <td>{scenario.title}</td>
                                <td>{scenario.category}</td>
                                <td>{scenario.automation}</td>
                                <td>
                                  <span
                                    className={`criticality-badge ${getCriticalityClassName(scenario.criticality)}`}
                                  >
                                    {scenario.criticality}
                                  </span>
                                </td>
                                <td className="scenario-observation">{scenario.observation}</td>
                                <td className="scenario-bdd">
                                  <button
                                    type="button"
                                    className="scenario-copy-button"
                                    onClick={() => void handleCopyBdd(scenario.bdd)}
                                  >
                                    Copiar BDD
                                  </button>
                                </td>
                                {canManageScenarios && (
                                  <td className="scenario-actions">
                                    <button
                                      type="button"
                                      onClick={() => handleEditScenario(scenario)}
                                      disabled={isSavingScenario}
                                    >
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
                    </>
                  )
                ) : (
                  <div
                    ref={suiteListRef}
                    className={`suite-manager ${isViewingSuitesOnly ? 'suite-manager--suites-only' : ''}`}
                  >
                    {isViewingSuitesOnly ? (
                      <div className="suite-cards-view">
                        <div className="suite-table-header">
                          <span className="suite-preview-title">Suítes cadastradas</span>
                          <button
                            type="button"
                            className="link-button"
                            onClick={handleBackToSuiteForm}
                          >
                            Voltar para formulário
                          </button>
                        </div>
                        {isLoadingSuites ? (
                          <p className="section-subtitle">Carregando suítes de testes...</p>
                        ) : suites.length === 0 ? (
                          <p className="section-subtitle">
                            Nenhuma suíte cadastrada ainda. Utilize o formulário para criar sua
                            primeira seleção.
                          </p>
                        ) : (
                          <div className="suite-cards-grid">
                            {suites
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((suite) => {
                                const isActive = selectedSuitePreviewId === suite.id;
                                return (
                                  <button
                                    key={suite.id}
                                    type="button"
                                    className={`suite-card-trigger ${isActive ? 'is-active' : ''}`}
                                    onClick={() =>
                                      setSelectedSuitePreviewId((previous) =>
                                        previous === suite.id ? null : suite.id,
                                      )
                                    }
                                  >
                                    <span>{suite.name}</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                        {!selectedSuitePreview ? (
                          <p className="section-subtitle">
                            Clique em um card para visualizar os cenários associados.
                          </p>
                        ) : selectedSuitePreviewEntries.length === 0 ? (
                          <p className="section-subtitle">
                            Esta suíte não possui cenários cadastrados ou alguns itens foram
                            removidos.
                          </p>
                        ) : (
                          <div className="suite-preview suite-preview--cards">
                            <table className="suite-preview-table">
                              <thead>
                                <tr>
                                  <th>Suíte</th>
                                  <th>Cenário</th>
                                  <th>Categoria</th>
                                  <th>Automação</th>
                                  <th>Criticidade</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSuitePreviewEntries.map(({ scenarioId, scenario }) => (
                                  <tr key={`${selectedSuitePreview.id}-${scenarioId}`}>
                                    <td>{selectedSuitePreview.name}</td>
                                    <td>{scenario?.title ?? 'Cenário removido'}</td>
                                    <td>{scenario?.category ?? 'N/A'}</td>
                                    <td>{scenario?.automation ?? '-'}</td>
                                    <td>{scenario?.criticality ?? '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {selectedSuitePreview && canManageScenarios && (
                          <div className="suite-preview-actions">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleEditSuite(selectedSuitePreview)}
                              disabled={isSavingSuite}
                            >
                              Editar suíte
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleDeleteSuite(selectedSuitePreview)}
                              disabled={isSavingSuite}
                              className="suite-delete"
                            >
                              Excluir suíte
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="suite-form">
                          <form
                            className="card suite-card suite-editor-card"
                            onSubmit={handleSuiteSubmit}
                          >
                            <div className="suite-form-header-actions suite-editor-actions">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleShowSuitesOnly}
                              >
                                Ir para cadastradas
                              </Button>
                              {editingSuiteId && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={handleCancelSuiteEdit}
                                  disabled={isSavingSuite}
                                >
                                  Cancelar edição
                                </Button>
                              )}
                            </div>
                            <div className="suite-form-header">
                              <div>
                                <h3 className="form-title">
                                  {editingSuiteId
                                    ? 'Editar suíte de testes'
                                    : 'Nova suíte de testes'}
                                </h3>
                                <p className="suite-form-description">
                                  Escolha quais cenários farão parte do grupo e utilize a seção de
                                  suítes cadastradas para validar a massa antes de salvar.
                                </p>
                              </div>
                            </div>
                            {suiteFormError && (
                              <p className="form-message form-message--error">{suiteFormError}</p>
                            )}
                            <div className="suite-basic-info">
                              <TextInput
                                id="suite-name"
                                label="Nome da suíte"
                                value={suiteForm.name}
                                onChange={handleSuiteFormChange('name')}
                                required
                              />
                              <TextArea
                                id="suite-description"
                                label="Descrição"
                                value={suiteForm.description}
                                onChange={handleSuiteFormChange('description')}
                                required
                              />
                            </div>
                            <div className="suite-scenario-selector">
                              <div className="suite-scenario-selector-header">
                                <p className="field-label">Seleção de cenários</p>
                                <p className="suite-scenario-selector-description">
                                  {scenarios.length === 0
                                    ? 'Cadastre cenários na seção acima para começar a criar suítes.'
                                    : 'Marque abaixo os cenários que deverão compor esta suíte.'}
                                </p>
                              </div>
                              <p className="suite-selection-summary">{suiteSelectionSummary}</p>
                              {scenarios.length === 0 ? (
                                <p className="category-manager-empty">
                                  Nenhum cenário disponível para seleção no momento.
                                </p>
                              ) : (
                                <>
                                  <div className="scenario-filter-bar suite-scenario-filters">
                                    <input
                                      type="text"
                                      className="scenario-filter-input"
                                      placeholder="Busque pelo título do cenário"
                                      value={suiteScenarioFilters.search}
                                      onChange={handleSuiteScenarioFilterChange('search')}
                                      aria-label="Buscar cenários por título"
                                    />
                                    <select
                                      className="scenario-filter-input"
                                      value={suiteScenarioFilters.category}
                                      onChange={handleSuiteScenarioFilterChange('category')}
                                      aria-label="Filtrar por categoria"
                                    >
                                      {categoryFilterOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      className="scenario-filter-input"
                                      value={suiteScenarioFilters.criticality}
                                      onChange={handleSuiteScenarioFilterChange('criticality')}
                                      aria-label="Filtrar por criticidade"
                                    >
                                      {criticalityFilterOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    {(suiteScenarioFilters.search ||
                                      suiteScenarioFilters.category ||
                                      suiteScenarioFilters.criticality) && (
                                      <button
                                        type="button"
                                        className="scenario-filter-clear"
                                        onClick={handleClearSuiteScenarioFilters}
                                      >
                                        Limpar filtros
                                      </button>
                                    )}
                                  </div>
                                  {filteredSuiteScenarios.length === 0 ? (
                                    <p className="category-manager-empty">
                                      Nenhum cenário corresponde aos filtros aplicados.
                                    </p>
                                  ) : (
                                    <div className="suite-scenario-table-wrapper">
                                      <table className="scenario-table suite-scenario-table">
                                        <thead>
                                          <tr>
                                            <th className="suite-scenario-checkbox">Selecionar</th>
                                            <th>Título</th>
                                            <th>Categoria</th>
                                            <th>Automação</th>
                                            <th>Criticidade</th>
                                            <th>Observação</th>
                                            <th>BDD</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {filteredSuiteScenarios.map((scenario) => {
                                            const isSelected = suiteForm.scenarioIds.includes(
                                              scenario.id,
                                            );
                                            return (
                                              <tr
                                                key={scenario.id}
                                                className={isSelected ? 'is-selected' : ''}
                                              >
                                                <td className="suite-scenario-checkbox">
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                      handleSuiteScenarioToggle(scenario.id)
                                                    }
                                                    aria-label={`Selecionar cenário ${scenario.title}`}
                                                  />
                                                </td>
                                                <td>{scenario.title}</td>
                                                <td>{scenario.category}</td>
                                                <td>{scenario.automation}</td>
                                                <td>
                                                  <span
                                                    className={`criticality-badge ${getCriticalityClassName(
                                                      scenario.criticality,
                                                    )}`}
                                                  >
                                                    {scenario.criticality}
                                                  </span>
                                                </td>
                                                <td className="scenario-observation">
                                                  {scenario.observation}
                                                </td>
                                                <td className="scenario-bdd">
                                                  <button
                                                    type="button"
                                                    className="scenario-copy-button"
                                                    onClick={() => void handleCopyBdd(scenario.bdd)}
                                                  >
                                                    Copiar BDD
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="suite-form-actions">
                              <Button
                                type="submit"
                                isLoading={isSavingSuite}
                                loadingText="Salvando..."
                              >
                                {editingSuiteId ? 'Atualizar suíte' : 'Salvar suíte'}
                              </Button>
                            </div>
                          </form>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      {storeId && (
        <section className="page-container">
          <div className="card">
            <KanbanAmbientes storeId={storeId} suites={suites} scenarios={scenarios} />
          </div>
        </section>
      )}
    </Layout>
  );
};
