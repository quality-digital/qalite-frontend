import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import type {
  Store,
  StoreCategory,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
} from '../../domain/entities/store';
import type {
  StoreExportPayload,
  StoreSuiteExportPayload,
} from '../../infrastructure/external/stores';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { scenarioExecutionService } from '../../application/use-cases/ScenarioExecutionUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { SelectInput } from '../components/SelectInput';
import { Modal } from '../components/Modal';
import { PageLoader } from '../components/PageLoader';
import {
  AUTOMATION_OPTIONS,
  CRITICALITY_OPTIONS,
  getCriticalityClassName,
} from '../constants/scenarioOptions';
import { EnvironmentKanban } from '../components/environments/EnvironmentKanban';
import {
  ScenarioColumnSortControl,
  createScenarioSortComparator,
  sortScenarioList,
  type ScenarioSortConfig,
} from '../components/ScenarioColumnSortControl';
import { useStoreEnvironments } from '../hooks/useStoreEnvironments';
import {
  downloadJsonFile,
  validateScenarioImportPayload,
  validateSuiteImportPayload,
} from '../../shared/utils/storeImportExport';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { formatDurationFromMs } from '../../shared/utils/time';
import type { ScenarioAverageMap } from '../../infrastructure/external/scenarioExecutions';

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

interface StoreHighlight {
  id: string;
  label: string;
  value: string;
  description?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const emptyScenarioFilters: ScenarioFilters = {
  search: '',
  category: '',
  criticality: '',
};

const normalizeStoreSite = (site?: string | null) => {
  const trimmed = site?.trim();

  if (!trimmed) {
    return { label: 'Não informado', href: null };
  }

  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return { label: trimmed, href };
};

const filterScenarios = (list: StoreScenario[], filters: ScenarioFilters) => {
  const searchValue = filters.search.trim().toLowerCase();
  const filtered = list.filter((scenario) => {
    const matchesSearch = !searchValue || scenario.title.toLowerCase().includes(searchValue);
    const matchesCategory = !filters.category || scenario.category === filters.category;
    const matchesCriticality = !filters.criticality || scenario.criticality === filters.criticality;
    return matchesSearch && matchesCategory && matchesCriticality;
  });

  return filtered;
};

export const StoreSummaryPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();

  const [store, setStore] = useState<Store | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [suites, setSuites] = useState<StoreSuite[]>([]);
  const [scenarioTimingById, setScenarioTimingById] = useState<ScenarioAverageMap>({});
  const [isLoadingScenarioTimings, setIsLoadingScenarioTimings] = useState(false);
  const [scenarioTimingError, setScenarioTimingError] = useState<string | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [isLoadingSuites, setIsLoadingSuites] = useState(true);
  const [scenarioForm, setScenarioForm] = useState<StoreScenarioInput>(emptyScenarioForm);
  const [scenarioFormError, setScenarioFormError] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSyncingLegacyCategories, setIsSyncingLegacyCategories] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isCategoryListCollapsed, setIsCategoryListCollapsed] = useState(true);
  const [isScenarioTableCollapsed, setIsScenarioTableCollapsed] = useState(false);
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [suiteForm, setSuiteForm] = useState<StoreSuiteInput>(emptySuiteForm);
  const [suiteFormError, setSuiteFormError] = useState<string | null>(null);
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  const [isSavingSuite, setIsSavingSuite] = useState(false);
  const [viewMode, setViewMode] = useState<'scenarios' | 'suites'>('scenarios');
  const [scenarioFilters, setScenarioFilters] = useState<ScenarioFilters>(emptyScenarioFilters);
  const [suiteScenarioFilters, setSuiteScenarioFilters] =
    useState<ScenarioFilters>(emptyScenarioFilters);
  const [suiteScenarioSort, setSuiteScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [selectedSuitePreviewId, setSelectedSuitePreviewId] = useState<string | null>(null);
  const [suitePreviewSort, setSuitePreviewSort] = useState<ScenarioSortConfig | null>(null);
  const [isViewingSuitesOnly, setIsViewingSuitesOnly] = useState(false);
  const suiteListRef = useRef<HTMLDivElement | null>(null);
  const scenarioFileInputRef = useRef<HTMLInputElement | null>(null);
  const suiteFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExportingScenarios, setIsExportingScenarios] = useState(false);
  const [isImportingScenarios, setIsImportingScenarios] = useState(false);
  const [isExportingSuites, setIsExportingSuites] = useState(false);
  const [isImportingSuites, setIsImportingSuites] = useState(false);
  const storeSiteInfo = useMemo(() => normalizeStoreSite(store?.site), [store?.site]);
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState({ name: '', site: '' });
  const [storeSettingsError, setStoreSettingsError] = useState<string | null>(null);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const {
    environments,
    isLoading: isLoadingEnvironments,
    statusCounts: environmentStatusCounts,
  } = useStoreEnvironments(storeId);
  const selectedSuiteScenarioCount = suiteForm.scenarioIds.length;
  const suiteSelectionSummary =
    selectedSuiteScenarioCount === 0
      ? 'Nenhum cenário selecionado ainda.'
      : `${selectedSuiteScenarioCount} cenário${selectedSuiteScenarioCount === 1 ? '' : 's'} selecionado${selectedSuiteScenarioCount === 1 ? '' : 's'}.`;

  const isPreparingStoreView =
    isLoadingStore ||
    isLoadingScenarios ||
    isLoadingSuites ||
    isLoadingCategories ||
    isSyncingLegacyCategories;

  const canManageScenarios = Boolean(user);
  const canManageStoreSettings = user?.role === 'admin';
  const canToggleCategoryList =
    !isLoadingCategories && !isSyncingLegacyCategories && categories.length > 0;
  const automatedScenarioCount = useMemo(
    () => scenarios.filter((scenario) => isAutomatedScenario(scenario.automation)).length,
    [scenarios],
  );
  const suitesWithScenariosCount = useMemo(
    () => suites.filter((suite) => suite.scenarioIds.length > 0).length,
    [suites],
  );
  const environmentInProgressCount = environmentStatusCounts.in_progress;
  const environmentTotalCount = environmentStatusCounts.total;
  const storeHighlights = useMemo<StoreHighlight[]>(() => {
    const scenarioDescription = `${automatedScenarioCount} automatizado${
      automatedScenarioCount === 1 ? '' : 's'
    }`;
    const suitesDescription = `${suitesWithScenariosCount} com cenário${
      suitesWithScenariosCount === 1 ? '' : 's'
    }`;
    const environmentDescription = isLoadingEnvironments
      ? 'Sincronizando ambientes...'
      : `${environmentInProgressCount} em andamento`;

    return [
      {
        id: 'scenarios',
        label: 'Massa de cenários',
        value: scenarios.length.toString(),
        description: scenarioDescription,
        isActive: viewMode === 'scenarios',
        onClick: () => {
          setViewMode('scenarios');
          setIsViewingSuitesOnly(false);
        },
      },
      {
        id: 'suites',
        label: 'Suítes de testes',
        value: suites.length.toString(),
        description: suitesDescription,
        isActive: viewMode === 'suites',
        onClick: () => setViewMode('suites'),
      },
      {
        id: 'environments',
        label: 'Ambientes',
        value: isLoadingEnvironments ? '...' : environmentTotalCount.toString(),
        description: environmentDescription,
      },
    ];
  }, [
    automatedScenarioCount,
    environmentInProgressCount,
    environmentTotalCount,
    isLoadingEnvironments,
    scenarios.length,
    suites.length,
    suitesWithScenariosCount,
    viewMode,
    setViewMode,
    setIsViewingSuitesOnly,
  ]);

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

  const persistedCategoryNames = useMemo(
    () =>
      categories
        .map((category) => category.name.trim())
        .filter((categoryName) => categoryName.length > 0),
    [categories],
  );

  const availableCategories = useMemo(() => {
    const combined = new Set([...persistedCategoryNames, ...scenarioCategories]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [persistedCategoryNames, scenarioCategories]);

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
  const orderedFilteredScenarios = useMemo(
    () => sortScenarioList(filteredScenarios, scenarioSort),
    [filteredScenarios, scenarioSort],
  );

  const filteredSuiteScenarios = useMemo(
    () => filterScenarios(scenarios, suiteScenarioFilters),
    [scenarios, suiteScenarioFilters],
  );
  const orderedSuiteScenarios = useMemo(
    () => sortScenarioList(filteredSuiteScenarios, suiteScenarioSort),
    [filteredSuiteScenarios, suiteScenarioSort],
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

  const orderedSuitePreviewEntries = useMemo(() => {
    if (!suitePreviewSort) {
      return selectedSuitePreviewEntries;
    }

    const comparator = createScenarioSortComparator(suitePreviewSort);

    return selectedSuitePreviewEntries.slice().sort((first, second) =>
      comparator(
        {
          criticality: first.scenario?.criticality ?? '',
          category: first.scenario?.category ?? '',
          automation: first.scenario?.automation ?? '',
          title: first.scenario?.title ?? '',
        },
        {
          criticality: second.scenario?.criticality ?? '',
          category: second.scenario?.category ?? '',
          automation: second.scenario?.automation ?? '',
          title: second.scenario?.title ?? '',
        },
      ),
    );
  }, [selectedSuitePreviewEntries, suitePreviewSort]);

  const getScenarioTimingInfo = (scenarioId?: string | null) => {
    if (!scenarioId) {
      return {
        label: '—',
        title: 'Cenário não identificado.',
      };
    }

    const entry = scenarioTimingById[scenarioId];

    if (entry) {
      const executionsLabel = `${entry.executions} execução${entry.executions === 1 ? '' : 'es'}`;
      return {
        label: formatDurationFromMs(entry.averageMs),
        title: `${executionsLabel} registradas nesta loja. Melhor tempo ${formatDurationFromMs(entry.bestMs)}.`,
      };
    }

    if (isLoadingScenarioTimings) {
      return {
        label: 'Carregando...',
        title: 'Buscando o tempo médio deste cenário.',
      };
    }

    if (scenarioTimingError) {
      return {
        label: '—',
        title: scenarioTimingError,
      };
    }

    return {
      label: '—',
      title: 'Ainda não há execuções registradas para este cenário nesta loja.',
    };
  };

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
    if (!storeId) {
      setScenarioTimingById({});
      setScenarioTimingError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingScenarioTimings(true);
    setScenarioTimingError(null);

    const fetchScenarioTimings = async () => {
      try {
        const data = await scenarioExecutionService.getStoreScenarioAverages(storeId);
        if (isMounted) {
          setScenarioTimingById(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setScenarioTimingById({});
          setScenarioTimingError('Não foi possível carregar os tempos de teste desta loja.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingScenarioTimings(false);
        }
      }
    };

    void fetchScenarioTimings();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (scenarios.length === 0) {
      setIsScenarioTableCollapsed(false);
    }
  }, [scenarios.length]);

  useEffect(() => {
    setIsCategoryListCollapsed(true);
    setScenarioSort(null);
    setSuiteScenarioSort(null);
    setSuitePreviewSort(null);
  }, [storeId]);

  const openStoreSettings = () => {
    if (!store || !canManageStoreSettings) {
      return;
    }

    setStoreSettings({ name: store.name, site: store.site });
    setStoreSettingsError(null);
    setIsStoreSettingsOpen(true);
  };

  const closeStoreSettings = () => {
    setIsStoreSettingsOpen(false);
    setStoreSettingsError(null);
  };

  const handleStoreSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!store || !canManageStoreSettings) {
      return;
    }

    const trimmedName = storeSettings.name.trim();
    const trimmedSite = storeSettings.site.trim();

    if (!trimmedName) {
      setStoreSettingsError('Informe o nome da loja.');
      return;
    }

    if (!trimmedSite) {
      setStoreSettingsError('Informe o site da loja.');
      return;
    }

    try {
      setIsUpdatingStore(true);
      const updated = await storeService.update(store.id, {
        name: trimmedName,
        site: trimmedSite,
        stage: store.stage,
      });

      setStore(updated);
      setStoreSettings({ name: updated.name, site: updated.site });
      closeStoreSettings();
      showToast({ type: 'success', message: 'Loja atualizada com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a loja.';
      setStoreSettingsError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsUpdatingStore(false);
    }
  };

  const handleRemoveStore = async () => {
    if (!store || !canManageStoreSettings) {
      return;
    }

    const confirmation = window.confirm(
      `Deseja remover a loja "${store.name}"? Esta ação não pode ser desfeita.`,
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsDeletingStore(true);
      await storeService.delete(store.id);
      closeStoreSettings();
      showToast({ type: 'success', message: 'Loja removida com sucesso.' });
      const redirectTo =
        user?.role === 'admin'
          ? `/admin/organizations?organizationId=${store.organizationId}`
          : '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover a loja.';
      showToast({ type: 'error', message });
    } finally {
      setIsDeletingStore(false);
    }
  };

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
    if (!store?.id) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }

    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const data = await storeService.listCategories(store.id);
        if (isMounted) {
          setCategories(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          showToast({ type: 'error', message: 'Não foi possível carregar as categorias.' });
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    };

    void fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [showToast, store?.id]);

  useEffect(() => {
    setNewCategoryName('');
    setCategoryError(null);
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setUpdatingCategoryId(null);
    setDeletingCategoryId(null);
    setIsCreatingCategory(false);
    setIsSyncingLegacyCategories(false);
  }, [store?.id]);

  useEffect(() => {
    if (
      !store?.id ||
      isLoadingCategories ||
      isSyncingLegacyCategories ||
      scenarioCategories.size === 0
    ) {
      return;
    }

    const persistedNames = new Set(
      persistedCategoryNames.map((categoryName) => categoryName.toLowerCase()),
    );
    const missingLegacyCategories = Array.from(scenarioCategories).filter(
      (categoryName) => categoryName.length > 0 && !persistedNames.has(categoryName.toLowerCase()),
    );

    if (missingLegacyCategories.length === 0) {
      return;
    }

    let isMounted = true;

    const syncLegacyCategories = async () => {
      try {
        setIsSyncingLegacyCategories(true);
        const createdCategories: StoreCategory[] = [];

        for (const categoryName of missingLegacyCategories) {
          try {
            const created = await storeService.createCategory({
              storeId: store.id,
              name: categoryName,
            });
            createdCategories.push(created);
          } catch (error) {
            if (error instanceof Error && error.message.includes('Já existe')) {
              continue;
            }
            console.error(error);
          }
        }

        if (isMounted && createdCategories.length > 0) {
          setCategories((previous) =>
            [...previous, ...createdCategories].sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } finally {
        if (isMounted) {
          setIsSyncingLegacyCategories(false);
        }
      }
    };

    void syncLegacyCategories();

    return () => {
      isMounted = false;
    };
  }, [
    isLoadingCategories,
    isSyncingLegacyCategories,
    persistedCategoryNames,
    scenarioCategories,
    store?.id,
  ]);

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

  useEffect(() => {
    setActiveOrganization(organization);
  }, [organization, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  const handleCreateCategory = async () => {
    if (!store) {
      return;
    }

    const trimmedCategory = newCategoryName.trim();
    if (!trimmedCategory) {
      setCategoryError('Informe o nome da nova categoria.');
      return;
    }

    try {
      setIsCreatingCategory(true);
      const created = await storeService.createCategory({
        storeId: store.id,
        name: trimmedCategory,
      });
      setCategories((previous) =>
        [...previous, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setScenarioForm((previous) => ({ ...previous, category: trimmedCategory }));
      setNewCategoryName('');
      setCategoryError(null);
      showToast({ type: 'success', message: 'Categoria criada com sucesso.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível criar a categoria.';
      setCategoryError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleStartEditCategory = (category: StoreCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setCategoryError(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleUpdateCategory = async () => {
    if (!store || !editingCategoryId) {
      return;
    }

    const trimmedName = editingCategoryName.trim();
    if (!trimmedName) {
      setCategoryError('Informe o nome da categoria.');
      return;
    }

    const previousCategory = categories.find((category) => category.id === editingCategoryId);

    try {
      setUpdatingCategoryId(editingCategoryId);
      const updated = await storeService.updateCategory(store.id, editingCategoryId, {
        name: trimmedName,
      });
      setCategories((previous) =>
        previous
          .map((category) => (category.id === updated.id ? updated : category))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      if (previousCategory && previousCategory.name !== trimmedName) {
        setScenarios((previous) =>
          previous.map((scenario) =>
            scenario.category === previousCategory.name
              ? { ...scenario, category: trimmedName }
              : scenario,
          ),
        );
        setScenarioForm((previous) => ({
          ...previous,
          category: previous.category === previousCategory.name ? trimmedName : previous.category,
        }));
      }
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setCategoryError(null);
      showToast({ type: 'success', message: 'Categoria atualizada com sucesso.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível atualizar a categoria.';
      setCategoryError(message);
      showToast({ type: 'error', message });
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  const handleDeleteCategory = async (category: StoreCategory) => {
    if (!store) {
      return;
    }

    const confirmation = window.confirm(
      `Deseja remover a categoria "${category.name}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmation) {
      return;
    }

    try {
      setDeletingCategoryId(category.id);
      await storeService.deleteCategory(store.id, category.id);
      setCategories((previous) => previous.filter((item) => item.id !== category.id));
      if (scenarioForm.category === category.name) {
        setScenarioForm((previous) => ({ ...previous, category: '' }));
      }
      showToast({ type: 'success', message: 'Categoria removida com sucesso.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível remover esta categoria. Verifique se ela está em uso.';
      setCategoryError(message);
      showToast({ type: 'error', message });
    } finally {
      setDeletingCategoryId(null);
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

    const requiredFields = [
      trimmedScenario.title,
      trimmedScenario.category,
      trimmedScenario.automation,
      trimmedScenario.criticality,
    ];
    const hasEmptyField = requiredFields.some((value) => value === '');
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
      observation: scenario.observation ?? '',
      bdd: scenario.bdd ?? '',
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

  const handleScenarioExport = async () => {
    if (!store) {
      return;
    }

    try {
      setIsExportingScenarios(true);
      const data = await storeService.exportStore(store.id);
      downloadJsonFile(data, `${store.name.replace(/\s+/g, '_')}_cenarios.json`);
      showToast({ type: 'success', message: 'Exportação de cenários concluída.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível exportar os cenários desta loja.';
      showToast({ type: 'error', message });
    } finally {
      setIsExportingScenarios(false);
    }
  };

  const handleScenarioImportClick = () => {
    if (!canManageScenarios) {
      return;
    }

    scenarioFileInputRef.current?.click();
  };

  const handleScenarioImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !store) {
      return;
    }

    try {
      setIsImportingScenarios(true);
      const content = await file.text();
      const parsed = JSON.parse(content) as StoreExportPayload;
      validateScenarioImportPayload(parsed);

      const importedStoreName = parsed.store.name.trim().toLowerCase();
      const selectedStoreName = store.name.trim().toLowerCase();
      if (
        parsed.store.id &&
        parsed.store.id !== store.id &&
        importedStoreName !== selectedStoreName
      ) {
        throw new Error('O arquivo selecionado pertence a outra loja.');
      }

      if (parsed.scenarios.length === 0) {
        showToast({ type: 'info', message: 'Nenhum cenário encontrado para importar.' });
        return;
      }

      const shouldReplace = window.confirm(
        'Deseja sobrescrever os cenários atuais? Clique em Cancelar para mesclar com os existentes.',
      );
      const strategy = shouldReplace ? 'replace' : 'merge';
      const scenariosPayload = parsed.scenarios.map((scenario) => ({
        title: scenario.title,
        category: scenario.category,
        automation: scenario.automation,
        criticality: scenario.criticality,
        observation: scenario.observation?.trim() ?? '',
        bdd: scenario.bdd?.trim() ?? '',
      }));

      const result = await storeService.importScenarios(store.id, scenariosPayload, strategy);
      setScenarios(result.scenarios);
      setStore((previous) =>
        previous ? { ...previous, scenarioCount: result.scenarios.length } : previous,
      );

      const feedbackMessage =
        result.strategy === 'replace'
          ? `Cenários substituídos com sucesso (${result.scenarios.length} itens).`
          : `Importação concluída. ${result.created} novo(s) cenário(s) adicionados, ${result.skipped} ignorados.`;

      showToast({ type: 'success', message: feedbackMessage });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível importar o arquivo selecionado.';
      showToast({ type: 'error', message });
    } finally {
      setIsImportingScenarios(false);
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

  const handleSelectAllSuiteScenarios = () => {
    if (filteredSuiteScenarios.length === 0) {
      return;
    }

    setSuiteForm((previous) => {
      const nextSelection = new Set(previous.scenarioIds);
      filteredSuiteScenarios.forEach((scenario) => nextSelection.add(scenario.id));
      return { ...previous, scenarioIds: Array.from(nextSelection) };
    });
  };

  const handleClearSuiteSelection = () => {
    setSuiteForm((previous) => ({ ...previous, scenarioIds: [] }));
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

  const handleSuiteExport = async () => {
    if (!store) {
      return;
    }

    try {
      setIsExportingSuites(true);
      const data = await storeService.exportSuites(store.id);
      downloadJsonFile(data, `${store.name.replace(/\s+/g, '_')}_suites.json`);
      showToast({ type: 'success', message: 'Exportação de suítes concluída.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível exportar as suítes desta loja.';
      showToast({ type: 'error', message });
    } finally {
      setIsExportingSuites(false);
    }
  };

  const handleSuiteImportClick = () => {
    if (!canManageScenarios) {
      return;
    }

    suiteFileInputRef.current?.click();
  };

  const handleSuiteImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !store) {
      return;
    }

    try {
      setIsImportingSuites(true);
      const content = await file.text();
      const parsed = JSON.parse(content) as StoreSuiteExportPayload;
      validateSuiteImportPayload(parsed);

      const importedStoreName = parsed.store.name.trim().toLowerCase();
      const selectedStoreName = store.name.trim().toLowerCase();
      if (
        parsed.store.id &&
        parsed.store.id !== store.id &&
        importedStoreName !== selectedStoreName
      ) {
        throw new Error('O arquivo selecionado pertence a outra loja.');
      }

      if (parsed.suites.length === 0) {
        showToast({ type: 'info', message: 'Nenhuma suíte encontrada para importar.' });
        return;
      }

      const shouldReplace = window.confirm(
        'Deseja sobrescrever as suítes atuais? Clique em Cancelar para mesclar com as existentes.',
      );
      const strategy = shouldReplace ? 'replace' : 'merge';

      const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario.id]));
      const scenarioByTitle = new Map(
        scenarios.map((scenario) => [scenario.title.trim().toLowerCase(), scenario.id]),
      );
      let missingReferences = 0;

      const suitesPayload: StoreSuiteInput[] = parsed.suites.map((suite) => {
        const mappedScenarioIds: string[] = [];

        suite.scenarios.forEach((scenarioRef) => {
          const normalizedTitle = scenarioRef.title.trim().toLowerCase();
          const matchedId =
            (scenarioRef.id ? scenarioById.get(scenarioRef.id) : undefined) ||
            (normalizedTitle ? scenarioByTitle.get(normalizedTitle) : undefined);

          if (matchedId && !mappedScenarioIds.includes(matchedId)) {
            mappedScenarioIds.push(matchedId);
          } else if (scenarioRef.id || normalizedTitle) {
            missingReferences += 1;
          }
        });

        return {
          name: suite.name,
          description: suite.description,
          scenarioIds: mappedScenarioIds,
        };
      });

      const result = await storeService.importSuites(store.id, suitesPayload, strategy);
      setSuites(result.suites);

      if (editingSuiteId && !result.suites.some((item) => item.id === editingSuiteId)) {
        handleCancelSuiteEdit();
      }

      const summaryParts = [
        result.strategy === 'replace'
          ? `Suítes substituídas com sucesso (${result.suites.length} itens).`
          : `Importação concluída. ${result.created} nova(s) suíte(s), ${result.skipped} ignorada(s).`,
      ];

      if (missingReferences > 0) {
        summaryParts.push(
          `${missingReferences} referência${missingReferences === 1 ? '' : 's'} de cenário não encontrada${missingReferences === 1 ? '' : 's'} e ignorada${missingReferences === 1 ? '' : 's'}.`,
        );
      }

      showToast({ type: 'success', message: summaryParts.join(' ') });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível importar as suítes selecionadas.';
      showToast({ type: 'error', message });
    } finally {
      setIsImportingSuites(false);
    }
  };

  if (isPreparingStoreView) {
    return (
      <Layout>
        <section className="page-container">
          <PageLoader message="Carregando loja..." />
        </section>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <section className="page-container">
          <div className="page-header">
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
              >
                ← Voltar
              </Button>
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
            {store && canManageStoreSettings && (
              <div className="store-summary__actions">
                <Button type="button" variant="secondary" onClick={openStoreSettings}>
                  Configurações da loja
                </Button>
              </div>
            )}
          </div>

          <div className="card">
            {isLoadingStore ? (
              <p className="section-subtitle">Sincronizando dados da loja...</p>
            ) : !store ? (
              <p className="section-subtitle">Não foi possível encontrar os detalhes desta loja.</p>
            ) : (
              <div className="store-summary">
                <div className="store-summary-meta">
                  <div className="store-summary-context">
                    {organization?.name && <span>{organization.name}</span>}
                    <span>
                      {storeSiteInfo.href ? (
                        <a href={storeSiteInfo.href} target="_blank" rel="noreferrer noopener">
                          {storeSiteInfo.label}
                        </a>
                      ) : (
                        storeSiteInfo.label
                      )}
                    </span>
                  </div>
                  <div
                    className="store-summary-highlights"
                    role="group"
                    aria-label="Resumo da loja"
                  >
                    {storeHighlights.map((highlight) => {
                      const content = (
                        <>
                          <span className="store-summary-highlight__value">{highlight.value}</span>
                          <span className="store-summary-highlight__label">{highlight.label}</span>
                          {highlight.description && (
                            <span className="store-summary-highlight__description">
                              {highlight.description}
                            </span>
                          )}
                        </>
                      );

                      return highlight.onClick ? (
                        <button
                          key={highlight.id}
                          type="button"
                          className={`store-summary-highlight${highlight.isActive ? ' is-active' : ''}`}
                          onClick={highlight.onClick}
                          aria-pressed={highlight.isActive}
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          key={highlight.id}
                          className="store-summary-highlight"
                          aria-live="polite"
                        >
                          {content}
                        </div>
                      );
                    })}
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
                        <div className="category-manager-header-text">
                          <p className="field-label">Categorias disponíveis</p>
                          <p className="category-manager-description">
                            Cadastre, edite ou remova as categorias utilizadas para organizar a
                            massa de cenários. Uma categoria só pode ser removida se não estiver
                            associada a nenhum cenário.
                          </p>
                        </div>
                        {canToggleCategoryList && (
                          <button
                            type="button"
                            className="category-manager-toggle"
                            onClick={() =>
                              setIsCategoryListCollapsed((previousState) => !previousState)
                            }
                            aria-expanded={!isCategoryListCollapsed}
                          >
                            {isCategoryListCollapsed ? 'Maximizar lista' : 'Minimizar lista'}
                          </button>
                        )}
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
                          disabled={!store}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCreateCategory}
                          isLoading={isCreatingCategory}
                          loadingText="Salvando..."
                          disabled={!store || isLoadingCategories || isSyncingLegacyCategories}
                        >
                          Adicionar categoria
                        </Button>
                      </div>
                      {categoryError && (
                        <p className="form-message form-message--error">{categoryError}</p>
                      )}
                      {isLoadingCategories || isSyncingLegacyCategories ? (
                        <p className="category-manager-description">Carregando categorias...</p>
                      ) : isCategoryListCollapsed && categories.length > 0 ? (
                        <p className="category-manager-description category-manager-collapsed-message">
                          Lista minimizada. Utilize o botão acima para visualizar novamente.
                        </p>
                      ) : categories.length > 0 ? (
                        <ul className="category-manager-list">
                          {categories.map((category) => {
                            const isEditingCategory = editingCategoryId === category.id;
                            const isCategoryUsed = scenarioCategories.has(category.name);
                            return (
                              <li key={category.id} className="category-manager-item">
                                {isEditingCategory ? (
                                  <>
                                    <input
                                      type="text"
                                      className="field-input"
                                      value={editingCategoryName}
                                      onChange={(event) => {
                                        setEditingCategoryName(event.target.value);
                                        setCategoryError(null);
                                      }}
                                    />
                                    <div className="category-manager-item-actions">
                                      <Button
                                        type="button"
                                        onClick={handleUpdateCategory}
                                        isLoading={updatingCategoryId === category.id}
                                        loadingText="Salvando..."
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleCancelEditCategory}
                                        disabled={updatingCategoryId === category.id}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="category-manager-item-name">
                                      {category.name}
                                    </span>
                                    <div className="category-manager-item-actions">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleStartEditCategory(category)}
                                        disabled={deletingCategoryId === category.id}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => handleDeleteCategory(category)}
                                        disabled={
                                          deletingCategoryId === category.id || isCategoryUsed
                                        }
                                        isLoading={deletingCategoryId === category.id}
                                        loadingText="Removendo..."
                                        title={
                                          isCategoryUsed
                                            ? 'Remova ou atualize os cenários associados antes de excluir.'
                                            : undefined
                                        }
                                      >
                                        Remover
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="category-manager-empty">
                          Nenhuma categoria cadastrada ainda.
                        </p>
                      )}
                    </div>
                    <TextArea
                      id="scenario-observation"
                      label="Observação"
                      value={scenarioForm.observation}
                      onChange={handleScenarioFormChange('observation')}
                    />
                    <TextArea
                      id="scenario-bdd"
                      label="BDD"
                      value={scenarioForm.bdd}
                      onChange={handleScenarioFormChange('bdd')}
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
                  </div>
                  <div className="scenario-table-actions">
                    {viewMode === 'scenarios' ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleScenarioExport}
                          isLoading={isExportingScenarios}
                          loadingText="Exportando..."
                        >
                          Exportar JSON
                        </Button>
                        {canManageScenarios && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleScenarioImportClick}
                            isLoading={isImportingScenarios}
                            loadingText="Importando..."
                          >
                            Importar JSON
                          </Button>
                        )}
                        {scenarios.length > 0 && (
                          <button
                            type="button"
                            className="scenario-table-toggle"
                            onClick={() => setIsScenarioTableCollapsed((previous) => !previous)}
                          >
                            {isScenarioTableCollapsed ? 'Maximizar tabela' : 'Minimizar tabela'}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSuiteExport}
                          isLoading={isExportingSuites}
                          loadingText="Exportando..."
                        >
                          Exportar suítes
                        </Button>
                        {canManageScenarios && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSuiteImportClick}
                            isLoading={isImportingSuites}
                            loadingText="Importando..."
                          >
                            Importar suítes
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <input
                  ref={scenarioFileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleScenarioImportFile}
                />
                <input
                  ref={suiteFileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleSuiteImportFile}
                />
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
                        {scenarioTimingError && (
                          <p className="form-message form-message--error" role="alert">
                            {scenarioTimingError}
                          </p>
                        )}
                        {filteredScenarios.length === 0 ? (
                          <p className="section-subtitle">
                            Nenhum cenário corresponde aos filtros aplicados.
                          </p>
                        ) : (
                          <div className="table-scroll-area">
                            <table className="scenario-table data-table">
                              <thead>
                                <tr>
                                  <th>Título</th>
                                  <th>
                                    <ScenarioColumnSortControl
                                      label="Categoria"
                                      field="category"
                                      sort={scenarioSort}
                                      onChange={setScenarioSort}
                                    />
                                  </th>
                                  <th>
                                    <ScenarioColumnSortControl
                                      label="Automação"
                                      field="automation"
                                      sort={scenarioSort}
                                      onChange={setScenarioSort}
                                    />
                                  </th>
                                  <th>
                                    <ScenarioColumnSortControl
                                      label="Criticidade"
                                      field="criticality"
                                      sort={scenarioSort}
                                      onChange={setScenarioSort}
                                    />
                                  </th>
                                  <th>Tempo de teste</th>
                                  <th>Observação</th>
                                  <th>BDD</th>
                                  {canManageScenarios && <th>Ações</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {orderedFilteredScenarios.map((scenario) => {
                                  const timingInfo = getScenarioTimingInfo(scenario.id);
                                  const hasBdd = Boolean(scenario.bdd?.trim());
                                  return (
                                    <tr key={scenario.id}>
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
                                      <td
                                        className="scenario-duration"
                                        data-label="Tempo de teste"
                                        title={timingInfo.title}
                                      >
                                        {timingInfo.label}
                                      </td>
                                      <td className="scenario-observation">
                                        {scenario.observation?.trim() || '—'}
                                      </td>
                                      <td className="scenario-bdd">
                                        {hasBdd ? (
                                          <button
                                            type="button"
                                            className="scenario-copy-button"
                                            onClick={() => void handleCopyBdd(scenario.bdd)}
                                          >
                                            Copiar BDD
                                          </button>
                                        ) : (
                                          <span className="scenario-bdd--empty">—</span>
                                        )}
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
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
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
                            <Button type="button" variant="ghost" onClick={handleBackToSuiteForm}>
                              Voltar para formulário
                            </Button>
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
                                      <span className="suite-card-trigger__title">
                                        {suite.name}
                                      </span>
                                      <span className="suite-card-trigger__count">
                                        {suite.scenarioIds.length} cenário
                                        {suite.scenarioIds.length === 1 ? '' : 's'}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                          {!selectedSuitePreview ? (
                            <p className="section-subtitle">
                              Clique em um card para visualizar os cenários associados.
                            </p>
                          ) : orderedSuitePreviewEntries.length === 0 ? (
                            <p className="section-subtitle">
                              Esta suíte não possui cenários cadastrados ou alguns itens foram
                              removidos.
                            </p>
                          ) : (
                            <div className="suite-preview suite-preview--cards">
                              <div className="suite-preview-description">
                                <p className="suite-description">
                                  {selectedSuitePreview?.description || 'Suíte não tem descrição.'}
                                </p>
                              </div>
                              <div className="table-scroll-area">
                                <table className="suite-preview-table data-table">
                                  <thead>
                                    <tr>
                                      <th>Cenário</th>
                                      <th>
                                        <ScenarioColumnSortControl
                                          label="Categoria"
                                          field="category"
                                          sort={suitePreviewSort}
                                          onChange={setSuitePreviewSort}
                                        />
                                      </th>
                                      <th>
                                        <ScenarioColumnSortControl
                                          label="Automação"
                                          field="automation"
                                          sort={suitePreviewSort}
                                          onChange={setSuitePreviewSort}
                                        />
                                      </th>
                                      <th>
                                        <ScenarioColumnSortControl
                                          label="Criticidade"
                                          field="criticality"
                                          sort={suitePreviewSort}
                                          onChange={setSuitePreviewSort}
                                        />
                                      </th>
                                      <th>Tempo de teste</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {orderedSuitePreviewEntries.map(({ scenarioId, scenario }) => {
                                      const timingInfo = getScenarioTimingInfo(
                                        scenario?.id ?? scenarioId,
                                      );
                                      return (
                                        <tr key={`${selectedSuitePreview.id}-${scenarioId}`}>
                                          <td data-label="Cenário">
                                            {scenario?.title ?? 'Cenário removido'}
                                          </td>
                                          <td data-label="Categoria">
                                            {scenario?.category ?? 'N/A'}
                                          </td>
                                          <td data-label="Automação">
                                            {scenario?.automation ?? '-'}
                                          </td>
                                          <td data-label="Criticidade">
                                            {scenario?.criticality ?? '-'}
                                          </td>
                                          <td data-label="Tempo de teste" title={timingInfo.title}>
                                            {timingInfo.label}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {selectedSuitePreview && canManageScenarios && (
                            <div className="suite-preview-actions">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleEditSuite(selectedSuitePreview)}
                                disabled={isSavingSuite}
                                className="suite-edit"
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
                              className="suite-card suite-editor-card"
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
                                  {scenarios.length === 0 && (
                                    <p className="suite-scenario-selector-description">
                                      Cadastre cenários na seção acima para começar a criar suítes.
                                    </p>
                                  )}
                                </div>
                                <p className="suite-selection-summary">{suiteSelectionSummary}</p>
                                {scenarios.length > 0 && (
                                  <div className="suite-selection-actions">
                                    <button
                                      type="button"
                                      className="suite-selection-action"
                                      onClick={handleSelectAllSuiteScenarios}
                                      disabled={filteredSuiteScenarios.length === 0}
                                    >
                                      Selecionar todos os cenários listados
                                    </button>
                                    <button
                                      type="button"
                                      className="suite-selection-action suite-selection-action--ghost"
                                      onClick={handleClearSuiteSelection}
                                      disabled={suiteForm.scenarioIds.length === 0}
                                    >
                                      Limpar seleção
                                    </button>
                                  </div>
                                )}
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
                                      <div className="suite-scenario-table-wrapper table-scroll-area">
                                        <table className="scenario-table suite-scenario-table data-table">
                                          <thead>
                                            <tr>
                                              <th className="suite-scenario-checkbox">
                                                Selecionar
                                              </th>
                                              <th>Título</th>
                                              <th>
                                                <ScenarioColumnSortControl
                                                  label="Categoria"
                                                  field="category"
                                                  sort={suiteScenarioSort}
                                                  onChange={setSuiteScenarioSort}
                                                />
                                              </th>
                                              <th>
                                                <ScenarioColumnSortControl
                                                  label="Automação"
                                                  field="automation"
                                                  sort={suiteScenarioSort}
                                                  onChange={setSuiteScenarioSort}
                                                />
                                              </th>
                                              <th>
                                                <ScenarioColumnSortControl
                                                  label="Criticidade"
                                                  field="criticality"
                                                  sort={suiteScenarioSort}
                                                  onChange={setSuiteScenarioSort}
                                                />
                                              </th>
                                              <th>Tempo de teste</th>
                                              <th>Observação</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {orderedSuiteScenarios.map((scenario) => {
                                              const isSelected = suiteForm.scenarioIds.includes(
                                                scenario.id,
                                              );
                                              const timingInfo = getScenarioTimingInfo(scenario.id);
                                              return (
                                                <tr
                                                  key={scenario.id}
                                                  className={isSelected ? 'is-selected' : ''}
                                                >
                                                  <td
                                                    className="suite-scenario-checkbox"
                                                    data-label="Selecionar"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={() =>
                                                        handleSuiteScenarioToggle(scenario.id)
                                                      }
                                                      aria-label={`Selecionar cenário ${scenario.title}`}
                                                    />
                                                  </td>
                                                  <td data-label="Título">{scenario.title}</td>
                                                  <td data-label="Categoria">
                                                    {scenario.category}
                                                  </td>
                                                  <td data-label="Automação">
                                                    {scenario.automation}
                                                  </td>
                                                  <td data-label="Criticidade">
                                                    <span
                                                      className={`criticality-badge ${getCriticalityClassName(
                                                        scenario.criticality,
                                                      )}`}
                                                    >
                                                      {scenario.criticality}
                                                    </span>
                                                  </td>
                                                  <td
                                                    className="scenario-duration"
                                                    data-label="Tempo de teste"
                                                    title={timingInfo.title}
                                                  >
                                                    {timingInfo.label}
                                                  </td>
                                                  <td
                                                    className="scenario-observation"
                                                    data-label="Observação"
                                                  >
                                                    {scenario.observation}
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
              <EnvironmentKanban
                storeId={storeId}
                suites={suites}
                scenarios={scenarios}
                environments={environments}
                isLoading={isLoadingEnvironments}
              />
            </div>
          </section>
        )}
      </Layout>

      <Modal
        isOpen={isStoreSettingsOpen}
        onClose={closeStoreSettings}
        title="Configurações da loja"
      >
        {storeSettingsError && (
          <p className="form-message form-message--error">{storeSettingsError}</p>
        )}
        <form className="form-grid" onSubmit={handleStoreSettingsSubmit}>
          <TextInput
            id="store-settings-name"
            label="Nome da loja"
            value={storeSettings.name}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, name: event.target.value }))
            }
            required
          />
          <TextInput
            id="store-settings-site"
            label="URL do site"
            value={storeSettings.site}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, site: event.target.value }))
            }
            required
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isUpdatingStore} loadingText="Salvando...">
              Salvar alterações
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreSettings}
              disabled={isUpdatingStore}
            >
              Cancelar
            </Button>
          </div>
        </form>

        <div className="modal-danger-zone">
          <div>
            <h4>Remover loja</h4>
            <p>Excluirá os cenários e suítes vinculados.</p>
          </div>
          <button
            type="button"
            className="link-danger"
            onClick={() => void handleRemoveStore()}
            disabled={isDeletingStore}
          >
            Remover loja
          </button>
        </div>
      </Modal>
    </>
  );
};
