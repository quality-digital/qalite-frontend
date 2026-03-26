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
import { organizationService } from '../../infrastructure/services/organizationService';
import { storeService } from '../../infrastructure/services/storeService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { SelectInput } from '../components/SelectInput';
import { Modal } from '../components/Modal';
import { PageLoader } from '../components/PageLoader';
import { LinkifiedText } from '../components/LinkifiedText';
import {
  AUTOMATION_OPTIONS,
  CRITICALITY_OPTIONS,
  getAutomationLabelKey,
  getCriticalityClassName,
  getCriticalityLabelKey,
} from '../constants/scenarioOptions';
import {
  CopyIcon,
  EyeIcon,
  FileTextIcon,
  PencilIcon,
  PlusCircleIcon,
  SettingsIcon,
  TrashIcon,
} from '../components/icons';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../shared/utils/scenarioEnums';
import { EnvironmentKanban } from '../components/environments/EnvironmentKanban';
import { PaginationControls } from '../components/PaginationControls';
import {
  ScenarioColumnSortControl,
  createScenarioSortComparator,
  sortScenarioList,
  type ScenarioSortConfig,
} from '../components/ScenarioColumnSortControl';
import { useStoreEnvironments } from '../hooks/useStoreEnvironments';
import { openScenarioPdf } from '../../shared/utils/storeImportExport';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { useTranslation } from 'react-i18next';
import { buildExternalLink } from '../utils/externalLink';
import { exportScenarioExcel } from '../../utils/exportExcel';
import { formatDateTime } from '../../shared/utils/time';

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

const SCENARIO_JSON_TEMPLATE: StoreScenarioInput[] = [
  {
    title: 'Validar login com usuário válido',
    category: 'Autenticação',
    automation: 'NOT_AUTOMATED',
    criticality: 'HIGH',
    observation: 'Cobrir web e app.',
    bdd: 'Dado que o usuário acessa a tela de login...',
  },
];

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

type ExportFormat = 'pdf' | 'xlsx';

const emptyScenarioFilters: ScenarioFilters = {
  search: '',
  category: '',
  criticality: '',
};

const PAGE_SIZE = 20;

const translateBddKeywords = (bdd: string, locale: string) => {
  const normalizedLocale = locale.toLowerCase();
  const target = normalizedLocale.startsWith('pt') ? 'pt' : 'en';

  const keywordMap =
    target === 'pt'
      ? {
          given: 'Dado',
          when: 'Quando',
          then: 'Então',
          and: 'E',
          but: 'Mas',
        }
      : {
          dado: 'Given',
          quando: 'When',
          então: 'Then',
          entao: 'Then',
          e: 'And',
          mas: 'But',
        };

  const sourcePattern =
    target === 'pt'
      ? /^(?<indent>\s*)(?<keyword>Given|When|Then|And|But)\b/i
      : /^(?<indent>\s*)(?<keyword>Dado|Quando|Então|Entao|E|Mas)\b/i;

  return bdd
    .split('\n')
    .map((line) => {
      const match = line.match(sourcePattern);
      if (!match || !match.groups?.keyword) {
        return line;
      }
      const keyword = match.groups.keyword.toLowerCase();
      const translated = keywordMap[keyword as keyof typeof keywordMap];
      if (!translated) {
        return line;
      }
      return `${match.groups.indent}${translated}${line.slice(match[0].length)}`;
    })
    .join('\n');
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
  const { setActiveOrganization, setActiveStore } = useOrganizationBranding();

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
  const [scenarioDetails, setScenarioDetails] = useState<{
    scenario: StoreScenario | null;
    scenarioId: string | null;
    source: 'scenario-table' | 'suite-preview';
  } | null>(null);
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
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [suiteForm, setSuiteForm] = useState<StoreSuiteInput>(emptySuiteForm);
  const [suiteFormError, setSuiteFormError] = useState<string | null>(null);
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  const [isSavingSuite, setIsSavingSuite] = useState(false);
  const [viewMode, setViewMode] = useState<'scenarios' | 'suites' | 'environments'>('scenarios');
  const [scenarioFilters, setScenarioFilters] = useState<ScenarioFilters>(emptyScenarioFilters);
  const [suiteScenarioFilters, setSuiteScenarioFilters] =
    useState<ScenarioFilters>(emptyScenarioFilters);
  const [suiteScenarioSort, setSuiteScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [selectedSuitePreviewId, setSelectedSuitePreviewId] = useState<string | null>(null);
  const [suitePreviewSort, setSuitePreviewSort] = useState<ScenarioSortConfig | null>(null);
  const [scenarioVisibleCount, setScenarioVisibleCount] = useState(PAGE_SIZE);
  const [suiteScenarioVisibleCount, setSuiteScenarioVisibleCount] = useState(PAGE_SIZE);
  const [suitePreviewVisibleCount, setSuitePreviewVisibleCount] = useState(PAGE_SIZE);
  const [isViewingSuitesOnly, setIsViewingSuitesOnly] = useState(false);
  const suiteListRef = useRef<HTMLDivElement | null>(null);
  const scenarioFormRef = useRef<HTMLFormElement | null>(null);
  const scenarioJsonInputRef = useRef<HTMLInputElement | null>(null);
  const [exportingScenarioFormat, setExportingScenarioFormat] = useState<ExportFormat | null>(null);
  const [isImportingScenarioJson, setIsImportingScenarioJson] = useState(false);
  const { t, i18n } = useTranslation();
  const storeSiteInfo = useMemo(() => {
    const link = buildExternalLink(store?.site);
    return {
      label: link.label || t('storeSummary.notInformed'),
      href: link.href,
    };
  }, [store?.site, t]);
  const storeAdminInfo = useMemo(() => {
    const link = buildExternalLink(store?.adminUrl);
    return {
      label: link.label || t('storeSummary.notInformed'),
      href: link.href,
    };
  }, [store?.adminUrl, t]);
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState({
    name: '',
    site: '',
    adminUrl: '',
    logoUrl: '',
    slackWebhookUrl: '',
    stage: 'WS' as 'WS' | 'Preview',
  });
  const [storeSettingsError, setStoreSettingsError] = useState<string | null>(null);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const [storeSettingsLogoFile, setStoreSettingsLogoFile] = useState<File | null>(null);
  const [storeSettingsLogoPreview, setStoreSettingsLogoPreview] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const {
    environments,
    isLoading: isLoadingEnvironments,
    statusCounts: environmentStatusCounts,
    addEnvironment,
  } = useStoreEnvironments(storeId);
  const selectedSuiteScenarioCount = suiteForm.scenarioIds.length;
  const suiteSelectionSummary =
    selectedSuiteScenarioCount === 0
      ? t('storeSummary.noScenario')
      : `${selectedSuiteScenarioCount} ${t('storeSummary.scenario')} ${t('storeSummary.selected')}`;

  const isPreparingStoreView = isLoadingStore && !store;

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
    const scenarioDescription = `${automatedScenarioCount} ${t('storeSummary.automatedCount')}${
      automatedScenarioCount === 1 ? '' : 's'
    }`;
    const suitesDescription = `${suitesWithScenariosCount} ${t('storeSummary.suitesWithScenariosCount')}${
      suitesWithScenariosCount === 1 ? '' : 's'
    }`;

    return [
      {
        id: 'scenarios',
        label: t('storeSummary.scenarios'),
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
        label: t('storeSummary.suites'),
        value: suites.length.toString(),
        description: suitesDescription,
        isActive: viewMode === 'suites',
        onClick: () => setViewMode('suites'),
      },
      {
        id: 'environments',
        label: t('storeSummary.environments'),
        value: isLoadingEnvironments ? '...' : environmentTotalCount.toString(),
        description: isLoadingEnvironments
          ? t('storeSummary.syncingEnvironments')
          : `${environmentInProgressCount} ${t('storeSummary.environmentsInProgress')}`,
        isActive: viewMode === 'environments',
        onClick: () => {
          setViewMode('environments');
          setIsViewingSuitesOnly(false);
        },
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
    t,
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
      return [{ value: '', label: t('storeSummary.registerCategory') }];
    }

    return [
      { value: '', label: t('storeSummary.selectCategory') },
      ...availableCategories.map((category) => ({ value: category, label: category })),
    ];
  }, [availableCategories, t]);

  const automationSelectOptions = useMemo(
    () => [
      { value: '', label: t('storeSummary.selectAutomation') },
      ...AUTOMATION_OPTIONS.map((opt) => ({
        ...opt,
        label: t(opt.label),
      })),
    ],
    [t],
  );

  const criticalitySelectOptions = useMemo(
    () => [
      { value: '', label: t('storeSummary.selectCriticality') },
      ...CRITICALITY_OPTIONS.map((opt) => ({
        ...opt,
        label: t(opt.label),
      })),
    ],
    [t],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: '', label: t('storeSummary.allCategories') },
      ...availableCategories.map((category) => ({ value: category, label: category })),
    ],
    [availableCategories, t],
  );

  const criticalityFilterOptions = useMemo(
    () => [
      { value: '', label: t('storeSummary.allCriticalities') },
      ...CRITICALITY_OPTIONS.map((opt) => ({
        ...opt,
        label: t(opt.label),
      })),
    ],
    [t],
  );

  const formatAutomationLabel = (value?: string | null) => {
    const labelKey = getAutomationLabelKey(value);
    if (labelKey) {
      return t(labelKey);
    }
    return value?.trim() || t('storeSummary.emptyValue');
  };

  const formatCriticalityLabel = (value?: string | null) => {
    const labelKey = getCriticalityLabelKey(value);
    if (labelKey) {
      return t(labelKey);
    }
    return value?.trim() || t('storeSummary.emptyValue');
  };

  const filteredScenarios = useMemo(
    () => filterScenarios(scenarios, scenarioFilters),
    [scenarioFilters, scenarios],
  );
  const orderedFilteredScenarios = useMemo(
    () => sortScenarioList(filteredScenarios, scenarioSort),
    [filteredScenarios, scenarioSort],
  );
  const paginatedScenarios = useMemo(
    () => orderedFilteredScenarios.slice(0, scenarioVisibleCount),
    [orderedFilteredScenarios, scenarioVisibleCount],
  );

  const filteredSuiteScenarios = useMemo(
    () => filterScenarios(scenarios, suiteScenarioFilters),
    [scenarios, suiteScenarioFilters],
  );
  const orderedSuiteScenarios = useMemo(() => {
    const ordered = sortScenarioList(filteredSuiteScenarios, suiteScenarioSort);
    const selectedScenarioIds = new Set(suiteForm.scenarioIds);

    if (selectedScenarioIds.size === 0) {
      return ordered;
    }

    return ordered
      .map((scenario, index) => ({
        scenario,
        index,
        isSelected: selectedScenarioIds.has(scenario.id),
      }))
      .sort((first, second) => {
        if (first.isSelected === second.isSelected) {
          return first.index - second.index;
        }
        return first.isSelected ? -1 : 1;
      })
      .map(({ scenario }) => scenario);
  }, [filteredSuiteScenarios, suiteForm.scenarioIds, suiteScenarioSort]);
  const paginatedSuiteScenarios = useMemo(
    () => orderedSuiteScenarios.slice(0, suiteScenarioVisibleCount),
    [orderedSuiteScenarios, suiteScenarioVisibleCount],
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
  const paginatedSuitePreviewEntries = useMemo(
    () => orderedSuitePreviewEntries.slice(0, suitePreviewVisibleCount),
    [orderedSuitePreviewEntries, suitePreviewVisibleCount],
  );

  useEffect(() => {
    setScenarioVisibleCount(PAGE_SIZE);
  }, [scenarioFilters, scenarioSort, scenarios.length]);

  useEffect(() => {
    setSuiteScenarioVisibleCount(PAGE_SIZE);
  }, [suiteScenarioFilters, suiteScenarioSort, scenarios.length]);

  useEffect(() => {
    setSuitePreviewVisibleCount(PAGE_SIZE);
  }, [selectedSuitePreviewId, suitePreviewSort]);

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

        const data = await storeService.getDetail(storeId);

        if (!data) {
          showToast({ type: 'error', message: t('storeSummary.storeNotFound') });
          navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
          return;
        }

        if (user.role !== 'admin' && user.organizationId !== data.organizationId) {
          showToast({ type: 'error', message: t('storeSummary.storeAccessDenied') });
          navigate('/dashboard', { replace: true });
          return;
        }

        setStore(data);

        const organizationData = await organizationService.getDetail(data.organizationId);

        if (organizationData) {
          setOrganization(organizationData);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: t('storeSummary.storeLoadError') });
      } finally {
        setIsLoadingStore(false);
      }
    };

    void fetchData();
  }, [isInitializing, navigate, showToast, storeId, user, t]);

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

    setStoreSettings({
      name: store.name,
      site: store.site,
      adminUrl: store.adminUrl ?? '',
      logoUrl: store.logoUrl ?? '',
      slackWebhookUrl: store.slackWebhookUrl ?? '',
      stage: store.stage === 'Preview' ? 'Preview' : 'WS',
    });
    setStoreSettingsLogoFile(null);
    setStoreSettingsLogoPreview(store.logoUrl ?? null);
    setStoreSettingsError(null);
    setIsStoreSettingsOpen(true);
  };

  const closeStoreSettings = () => {
    setIsStoreSettingsOpen(false);
    setStoreSettingsLogoFile(null);
    setStoreSettingsLogoPreview(null);
    setStoreSettingsError(null);
  };

  useEffect(() => {
    if (!storeSettingsLogoFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(storeSettingsLogoFile);
    setStoreSettingsLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [storeSettingsLogoFile]);

  const handleStoreSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!store || !canManageStoreSettings) {
      return;
    }

    const trimmedName = storeSettings.name.trim();
    const trimmedSite = storeSettings.site.trim();
    const trimmedAdminUrl = storeSettings.adminUrl.trim();

    const trimmedSlackWebhookUrl = storeSettings.slackWebhookUrl.trim();

    if (!trimmedName) {
      setStoreSettingsError(t('storeSummary.storeNameRequired'));
      return;
    }

    if (!trimmedSite) {
      setStoreSettingsError(t('storeSummary.storeSiteRequired'));
      return;
    }

    try {
      setIsUpdatingStore(true);
      const uploadedLogoUrl = storeSettingsLogoFile
        ? await storeService.uploadLogo(store.id, storeSettingsLogoFile)
        : undefined;
      const updated = await storeService.update(store.id, {
        name: trimmedName,
        site: trimmedSite,
        adminUrl: trimmedAdminUrl,
        stage: storeSettings.stage,

        ...(uploadedLogoUrl !== undefined
          ? { logoUrl: uploadedLogoUrl }
          : { logoUrl: storeSettings.logoUrl || null }),
        slackWebhookUrl: trimmedSlackWebhookUrl || null,
      });

      setStore(updated);
      setStoreSettings({
        name: updated.name,
        site: updated.site,
        adminUrl: updated.adminUrl ?? '',
        logoUrl: updated.logoUrl ?? '',
        slackWebhookUrl: updated.slackWebhookUrl ?? '',
        stage: updated.stage === 'Preview' ? 'Preview' : 'WS',
      });
      closeStoreSettings();
      showToast({ type: 'success', message: t('storeSummary.storeUpdateSuccess') });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.storeUpdateError');
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

    try {
      setIsDeletingStore(true);
      await storeService.delete(store.id);
      closeStoreSettings();
      showToast({ type: 'success', message: t('storeSummary.storeRemoveSuccess') });
      const redirectTo =
        user?.role === 'admin' ? `/admin/organizations?Id=${store.organizationId}` : '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.storeRemoveError');
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
    if (!store?.id) {
      setScenarios([]);
      setIsLoadingScenarios(false);
      return () => undefined;
    }

    setIsLoadingScenarios(true);
    const unsubscribe = storeService.listenToScenarios(
      store.id,
      (nextScenarios) => {
        setScenarios(nextScenarios);
        setIsLoadingScenarios(false);
      },
      (error) => {
        console.error(error);
        showToast({ type: 'error', message: t('storeSummary.storeLoadError') });
        setIsLoadingScenarios(false);
      },
    );

    return () => unsubscribe();
  }, [showToast, store?.id, t]);

  useEffect(() => {
    if (!store?.id) {
      setSuites([]);
      setIsLoadingSuites(false);
      return () => undefined;
    }

    setIsLoadingSuites(true);
    const unsubscribe = storeService.listenToSuites(
      store.id,
      (nextSuites) => {
        setSuites(nextSuites);
        setIsLoadingSuites(false);
      },
      (error) => {
        console.error(error);
        showToast({ type: 'error', message: t('storeSummary.suitesLoadError') });
        setIsLoadingSuites(false);
      },
    );

    return () => unsubscribe();
  }, [showToast, store?.id, t]);

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
          showToast({ type: 'error', message: t('storeSummary.categoriesLoadError') });
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
  }, [showToast, store?.id, t]);

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

  useEffect(() => {
    setActiveStore(
      store
        ? {
            id: store.id,
            name: store.name,
            logoUrl: store.logoUrl,
          }
        : null,
    );
  }, [setActiveStore, store]);

  useEffect(
    () => () => {
      setActiveOrganization(null);
      setActiveStore(null);
    },
    [setActiveOrganization, setActiveStore],
  );

  const handleCreateCategory = async () => {
    if (!store) {
      return;
    }

    const trimmedCategory = newCategoryName.trim();
    if (!trimmedCategory) {
      setCategoryError(t('storeSummary.newCategoryNameRequired'));
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
      showToast({ type: 'success', message: t('storeSummary.categoryCreateSuccess') });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : t('storeSummary.categoryCreateError');
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
      setCategoryError(t('storeSummary.categoryNameRequired'));
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
      showToast({ type: 'success', message: t('storeSummary.categoryUpdateSuccess') });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : t('storeSummary.categoryUpdateError');
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

    try {
      setDeletingCategoryId(category.id);
      await storeService.deleteCategory(store.id, category.id);
      setCategories((previous) => previous.filter((item) => item.id !== category.id));
      if (scenarioForm.category === category.name) {
        setScenarioForm((previous) => ({ ...previous, category: '' }));
      }
      showToast({ type: 'success', message: t('storeSummary.categoryRemoveSuccess') });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : t('storeSummary.categoryRemoveError');
      setCategoryError(message);
      showToast({ type: 'error', message });
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleCancelScenarioEdit = () => {
    setScenarioForm(emptyScenarioForm);
    setEditingScenarioId(null);
    setScenarioFormError(null);
  };

  const handleCopyBdd = async (bdd: string) => {
    if (!bdd.trim()) {
      showToast({ type: 'error', message: t('storeSummary.bddEmpty') });
      return;
    }

    try {
      if (!navigator?.clipboard) {
        showToast({ type: 'error', message: t('storeSummary.bddClipboardUnavailable') });
        return;
      }
      await navigator.clipboard.writeText(bdd);
      showToast({ type: 'success', message: t('storeSummary.bddCopied') });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: t('storeSummary.bddCopyError') });
    }
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
      automation: normalizeAutomationEnum(scenarioForm.automation.trim()),
      criticality: normalizeCriticalityEnum(scenarioForm.criticality.trim()),
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
      setScenarioFormError(t('storeSummary.scenarioFieldsRequired'));
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
        showToast({ type: 'success', message: t('storeSummary.scenarioUpdateSuccess') });
      } else {
        const created = await storeService.createScenario({
          storeId: store.id,
          ...trimmedScenario,
        });
        setScenarios((previous) => [...previous, created]);
        setStore((previous) =>
          previous ? { ...previous, scenarioCount: previous.scenarioCount + 1 } : previous,
        );
        showToast({ type: 'success', message: t('storeSummary.scenarioCreateSuccess') });
      }

      handleCancelScenarioEdit();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.scenarioSaveError');
      setScenarioFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const normalizeImportedScenario = (input: Record<string, unknown>): StoreScenarioInput => ({
    title: String(input.title ?? '').trim(),
    category: String(input.category ?? '').trim(),
    automation: normalizeAutomationEnum(String(input.automation ?? '').trim()),
    criticality: normalizeCriticalityEnum(String(input.criticality ?? '').trim()),
    observation: String(input.observation ?? '').trim(),
    bdd: String(input.bdd ?? '').trim(),
  });

  const downloadScenarioJsonTemplate = () => {
    const blob = new Blob([JSON.stringify(SCENARIO_JSON_TEMPLATE, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-cenarios.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleScenarioJsonImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !store) {
      return;
    }

    try {
      setIsImportingScenarioJson(true);
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      const items = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' &&
            parsed !== null &&
            Array.isArray((parsed as { scenarios?: unknown[] }).scenarios)
          ? (parsed as { scenarios: unknown[] }).scenarios
          : null;

      if (!items) {
        throw new Error(t('storeSummary.importJsonInvalid'));
      }

      const payloads = items
        .filter(
          (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
        )
        .map(normalizeImportedScenario);

      if (
        payloads.length === 0 ||
        payloads.some(
          (scenario) =>
            !scenario.title || !scenario.category || !scenario.automation || !scenario.criticality,
        )
      ) {
        throw new Error(t('storeSummary.importJsonInvalid'));
      }

      for (const scenario of payloads) {
        await storeService.createScenario({ storeId: store.id, ...scenario });
      }

      const [updatedScenarios, updatedCategories] = await Promise.all([
        storeService.listScenarios(store.id),
        storeService.listCategories(store.id),
      ]);
      setScenarios(updatedScenarios);
      setCategories(updatedCategories);
      showToast({
        type: 'success',
        message: t('storeSummary.importJsonSuccess', { count: payloads.length }),
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('storeSummary.importJsonError'),
      });
    } finally {
      event.target.value = '';
      setIsImportingScenarioJson(false);
    }
  };

  const handleEditScenario = (scenario: StoreScenario) => {
    if (!canManageScenarios) {
      return;
    }

    const normalizedAutomation = normalizeAutomationEnum(scenario.automation);
    const automationMatch = AUTOMATION_OPTIONS.find(
      (option) => option.value === normalizedAutomation,
    );

    setScenarioForm({
      title: scenario.title,
      category: scenario.category,
      automation: automationMatch?.value ?? scenario.automation,
      criticality: normalizeCriticalityEnum(scenario.criticality),
      observation: scenario.observation ?? '',
      bdd: scenario.bdd ?? '',
    });
    setEditingScenarioId(scenario.id);
    setScenarioFormError(null);
    scenarioFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteScenario = async (scenario: StoreScenario) => {
    if (!store || !canManageScenarios) {
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

      showToast({ type: 'success', message: t('storeSummary.scenarioRemoveSuccess') });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : t('storeSummary.scenarioRemoveError');
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleOpenScenarioDetails = (
    scenario: StoreScenario | null,
    scenarioId?: string | null,
    source: 'scenario-table' | 'suite-preview' = 'scenario-table',
  ) => {
    setScenarioDetails({
      scenario,
      scenarioId: scenario?.id ?? scenarioId ?? null,
      source,
    });
  };

  const handleCloseScenarioDetails = () => {
    setScenarioDetails(null);
  };

  const handleScenarioExport = async (format: ExportFormat) => {
    if (!store) {
      return;
    }

    let pdfWindow: Window | null = null;

    if (format === 'pdf') {
      pdfWindow = window.open('', '_blank');

      if (!pdfWindow) {
        showToast({
          type: 'error',
          message: t('storeSummary.pdfOpenError'),
        });
        return;
      }

      pdfWindow.document.write(
        "<p style='font-family: Inter, system-ui, -apple-system, sans-serif; padding: 24px;'>${t('storeSummary.pdfGenerating')}</p>",
      );
      pdfWindow.document.close();
    }

    try {
      setExportingScenarioFormat(format);
      const data = await storeService.exportStore(store.id);
      const baseFileName = `${store.name.replace(/\s+/g, '_')}_${t('storeSummary.exportFileSuffix')}`;

      if (format === 'xlsx') {
        const scenarioRows = data.scenarios.map((scenario) => ({
          titulo: scenario.title?.trim() || t('storeSummary.emptyValue'),
          categoria: scenario.category?.trim() || t('storeSummary.emptyValue'),
          automacao: formatAutomationLabel(scenario.automation),
          criticidade: formatCriticalityLabel(scenario.criticality),
          observacao: scenario.observation?.trim() || t('storeSummary.emptyValue'),
          bdd: scenario.bdd?.trim() || t('storeSummary.emptyValue'),
        }));
        const infoRows = [
          { label: t('storeSummary.store'), value: data.store.name },
          {
            label: t('storeSummary.siteLabel'),
            value: data.store.site?.trim() || t('storeSummary.notProvided'),
          },
          {
            label: t('storeSummary.environmentLabel'),
            value: data.store.stage?.trim() || t('storeSummary.notInformed'),
          },
          {
            label: t('storeSummary.scenarioCountLabel'),
            value: String(data.store.scenarioCount),
          },
          {
            label: t('storeSummary.exportedAtLabel'),
            value: formatDateTime(data.exportedAt, {
              locale: i18n.language,
              emptyLabel: t('storeSummary.notInformed'),
            }),
          },
        ];
        exportScenarioExcel({
          fileName: `${baseFileName}.xlsx`,
          scenarioSheetName: t('storeSummary.exportExcelSheetName'),
          infoSheetName: t('storeSummary.exportExcelInfoSheetName'),
          infoHeaderLabels: [t('exportExcel.field'), t('exportExcel.value')],
          infoRows,
          scenarioRows,
          scenarioHeaderLabels: [
            t('storeSummary.scenarioTitle'),
            t('storeSummary.category'),
            t('storeSummary.automation'),
            t('storeSummary.criticality'),
            t('storeSummary.observation'),
            t('storeSummary.bdd'),
          ],
        });
      }

      if (format === 'pdf') {
        openScenarioPdf(
          data,
          `${store.name} - ${t('scenarios')}`,
          pdfWindow,
          organization ? { name: organization.name, logoUrl: organization.logoUrl } : null,
        );
      }

      showToast({ type: 'success', message: t('storeSummary.scenarioExportSuccess') });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : t('storeSummary.scenarioExportError');
      showToast({ type: 'error', message });
      pdfWindow?.close();
    } finally {
      setExportingScenarioFormat(null);
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
      setScenarioVisibleCount(PAGE_SIZE);
      setScenarioFilters((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSuiteScenarioFilterChange =
    (field: keyof ScenarioFilters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSuiteScenarioVisibleCount(PAGE_SIZE);
      setSuiteScenarioFilters((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleClearScenarioFilters = () => {
    setScenarioFilters(emptyScenarioFilters);
    setScenarioVisibleCount(PAGE_SIZE);
  };

  const handleClearSuiteScenarioFilters = () => {
    setSuiteScenarioFilters(emptyScenarioFilters);
    setSuiteScenarioVisibleCount(PAGE_SIZE);
  };

  const handleSuiteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuiteFormError(null);

    if (!store || !canManageScenarios) {
      return;
    }

    const trimmedSuite: StoreSuiteInput = {
      name: suiteForm.name.trim(),
      description: '',
      scenarioIds: [...suiteForm.scenarioIds],
    };

    if (!trimmedSuite.name) {
      setSuiteFormError(t('storeSummary.suiteNameRequired'));
      return;
    }

    if (trimmedSuite.scenarioIds.length === 0) {
      setSuiteFormError(t('storeSummary.suiteScenarioRequired'));
      return;
    }

    try {
      setIsSavingSuite(true);
      if (editingSuiteId) {
        const updatedSuite = await storeService.updateSuite(store.id, editingSuiteId, trimmedSuite);
        setSuites((previous) =>
          previous.map((suite) => (suite.id === updatedSuite.id ? updatedSuite : suite)),
        );
        showToast({ type: 'success', message: t('storeSummary.suiteUpdateSuccess') });
      } else {
        const createdSuite = await storeService.createSuite({
          storeId: store.id,
          ...trimmedSuite,
        });
        setSuites((previous) => [...previous, createdSuite]);
        showToast({ type: 'success', message: t('storeSummary.suiteCreateSuccess') });
      }

      handleCancelSuiteEdit();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.suiteSaveError');
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
      description: '',
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

    try {
      setIsSavingSuite(true);
      await storeService.deleteSuite(store.id, suite.id);
      setSuites((previous) => previous.filter((item) => item.id !== suite.id));

      if (editingSuiteId === suite.id) {
        handleCancelSuiteEdit();
      }

      showToast({ type: 'success', message: t('storeSummary.suiteRemoveSuccess') });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.suiteRemoveError');
      showToast({ type: 'error', message });
    } finally {
      setIsSavingSuite(false);
    }
  };

  const openDeleteStoreModal = () => {
    if (!store || !canManageStoreSettings) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.storeDeleteConfirm', { name: store.name }),
      description: t('storeSummary.storeDeleteWarning'),
      onConfirm: handleRemoveStore,
    });
  };

  const openDeleteCategoryModal = (category: StoreCategory) => {
    if (!store) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.categoryDeleteConfirm', { name: category.name }),
      description: t('storeSummary.categoryDeleteWarning'),
      onConfirm: () => handleDeleteCategory(category),
    });
  };

  const openDeleteScenarioModal = (scenario: StoreScenario) => {
    if (!store || !canManageScenarios) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.scenarioDeleteConfirm', { title: scenario.title }),
      onConfirm: () => handleDeleteScenario(scenario),
    });
  };

  const openDeleteSuiteModal = (suite: StoreSuite) => {
    if (!store || !canManageScenarios) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.suiteDeleteConfirm', { name: suite.name }),
      onConfirm: () => handleDeleteSuite(suite),
    });
  };

  const closeDeleteConfirmation = () => {
    if (isConfirmingDelete) {
      return;
    }

    setDeleteConfirmation(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) {
      return;
    }

    try {
      setIsConfirmingDelete(true);
      await deleteConfirmation.onConfirm();
    } finally {
      setIsConfirmingDelete(false);
      setDeleteConfirmation(null);
    }
  };

  const handleBackClick = () => {
    if (user?.role === 'admin') {
      const targetOrganizationId = organization?.id ?? store?.organizationId;

      navigate(targetOrganizationId ? `/admin/organizations?Id=${targetOrganizationId}` : '/admin');
      return;
    }

    navigate('/dashboard');
  };

  if (isPreparingStoreView) {
    return (
      <Layout>
        <section className="page-container">
          <PageLoader message={t('storeSummary.loadingStore')} />
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
              <BackButton
                label={t('back')}
                onClick={(event) => {
                  event.preventDefault();
                  handleBackClick();
                }}
              />
              <h1 className="section-title">
                {isLoadingStore
                  ? t('storeSummary.loadingStore')
                  : (store?.name ?? t('storeSummary.store'))}
              </h1>
              {store && (
                <p className="section-subtitle">
                  {organization?.name ? `${organization.name} • ` : ''}
                  {storeSiteInfo.href ? (
                    <a
                      href={storeSiteInfo.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-link"
                    >
                      {storeSiteInfo.label}
                    </a>
                  ) : (
                    storeSiteInfo.label
                  )}
                </p>
              )}
            </div>
            {store && canManageStoreSettings && (
              <div className="store-summary__actions">
                <Button type="button" variant="secondary" onClick={openStoreSettings}>
                  <SettingsIcon aria-hidden className="icon" />
                  {t('storeSummary.storeConfigurations')}
                </Button>
              </div>
            )}
          </div>

          <div className="card">
            {isLoadingStore ? (
              <p className="section-subtitle">{t('storeSummary.syncingData')}</p>
            ) : !store ? (
              <p className="section-subtitle">{t('storeSummary.notFound')}</p>
            ) : (
              <div className="store-summary">
                <div className="store-summary-meta">
                  <div className="store-summary-context">
                    <span>
                      <strong>{t('storeSummary.storeUrl')}:</strong>{' '}
                      {storeSiteInfo.href ? (
                        <a href={storeSiteInfo.href} target="_blank" rel="noreferrer noopener">
                          {storeSiteInfo.label}
                        </a>
                      ) : (
                        storeSiteInfo.label
                      )}
                    </span>
                    <span>
                      <strong>{t('storeSummary.storeAdminUrl')}:</strong>{' '}
                      {storeAdminInfo.href ? (
                        <a href={storeAdminInfo.href} target="_blank" rel="noreferrer noopener">
                          {storeAdminInfo.label}
                        </a>
                      ) : (
                        storeAdminInfo.label
                      )}
                    </span>
                  </div>
                  <div
                    className="store-summary-highlights"
                    role="group"
                    aria-label={t('storeSummary.summaryAriaLabel')}
                  >
                    {storeHighlights.map((highlight) => {
                      const highlightClassName = `store-summary-highlight${highlight.isActive ? ' is-active' : ''}`;
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
                          className={highlightClassName}
                          onClick={highlight.onClick}
                          aria-pressed={highlight.isActive}
                        >
                          {content}
                        </button>
                      ) : (
                        <div key={highlight.id} className={highlightClassName} aria-live="polite">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {store && canManageScenarios && viewMode === 'scenarios' && (
                  <form
                    ref={scenarioFormRef}
                    className="scenario-form create-card"
                    onSubmit={handleScenarioSubmit}
                    data-testid="scenario-form"
                  >
                    <div className="create-card__header">
                      <h3 className="form-title">
                        {editingScenarioId
                          ? t('storeSummary.editScenario')
                          : t('storeSummary.createScenarioTitle')}
                      </h3>
                      <p className="create-card__description">
                        {t('storeSummary.createScenarioDescription')}
                      </p>
                    </div>
                    <input
                      ref={scenarioJsonInputRef}
                      type="file"
                      accept="application/json"
                      hidden
                      onChange={(event) => void handleScenarioJsonImport(event)}
                    />
                    {scenarioFormError && (
                      <p className="form-message form-message--error">{scenarioFormError}</p>
                    )}
                    <TextInput
                      id="scenario-title"
                      label={t('storeSummary.title')}
                      value={scenarioForm.title}
                      onChange={handleScenarioFormChange('title')}
                      required
                      dataTestId="scenario-title"
                    />
                    <div className="scenario-form-grid">
                      <SelectInput
                        id="scenario-category"
                        label={t('storeSummary.category')}
                        value={scenarioForm.category}
                        onChange={handleScenarioFormChange('category')}
                        options={categorySelectOptions}
                        required
                        dataTestId="scenario-category"
                      />
                      <SelectInput
                        id="scenario-automation"
                        label={t('storeSummary.automation')}
                        value={scenarioForm.automation}
                        onChange={handleScenarioFormChange('automation')}
                        options={automationSelectOptions}
                        required
                        dataTestId="scenario-automation"
                      />
                      <SelectInput
                        id="scenario-criticality"
                        label={t('storeSummary.criticality')}
                        value={scenarioForm.criticality}
                        onChange={handleScenarioFormChange('criticality')}
                        options={criticalitySelectOptions}
                        required
                        dataTestId="scenario-criticality"
                      />
                    </div>
                    <div className="category-manager">
                      <div className="category-manager-header">
                        <div className="category-manager-header-text">
                          <p className="field-label">{t('storeSummary.availableCategories')}</p>
                          <p className="category-manager-description">
                            {t('storeSummary.categoryManager')}
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
                            {isCategoryListCollapsed
                              ? t('storeSummary.maxList')
                              : t('storeSummary.minList')}
                          </button>
                        )}
                      </div>
                      <div className="category-manager-actions">
                        <input
                          type="text"
                          className="field-input"
                          placeholder={t('storeSummary.newCategory')}
                          value={newCategoryName}
                          onChange={(event) => {
                            setNewCategoryName(event.target.value);
                            setCategoryError(null);
                          }}
                          disabled={!store}
                          data-testid="new-category-input"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCreateCategory}
                          isLoading={isCreatingCategory}
                          loadingText={t('storeSummary.saving')}
                          disabled={!store || isLoadingCategories || isSyncingLegacyCategories}
                          data-testid="add-category-button"
                        >
                          <PlusCircleIcon aria-hidden className="icon" />
                          {t('storeSummary.addCategory')}
                        </Button>
                      </div>
                      {categoryError && (
                        <p className="form-message form-message--error">{categoryError}</p>
                      )}
                      {isLoadingCategories || isSyncingLegacyCategories ? (
                        <p className="category-manager-description">
                          {t('storeSummary.loadingCategories')}
                        </p>
                      ) : isCategoryListCollapsed && categories.length > 0 ? (
                        <p className="category-manager-description category-manager-collapsed-message">
                          {t('storeSummary.collapsedMessage')}
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
                                        loadingText={t('storeSummary.saving')}
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleCancelEditCategory}
                                        disabled={updatingCategoryId === category.id}
                                      >
                                        {t('cancel')}
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
                                        <PencilIcon aria-hidden className="icon" />
                                        {t('edit')}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => openDeleteCategoryModal(category)}
                                        disabled={
                                          deletingCategoryId === category.id || isCategoryUsed
                                        }
                                        isLoading={deletingCategoryId === category.id}
                                        loadingText={t('deleteLoading')}
                                        title={
                                          isCategoryUsed
                                            ? t('storeSummary.deleteMessage')
                                            : undefined
                                        }
                                      >
                                        <TrashIcon aria-hidden className="icon" />
                                        {t('delete')}
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="category-manager-empty">{t('storeSummary.emptyMessage')}</p>
                      )}
                    </div>
                    <TextArea
                      id="scenario-observation"
                      label={t('storeSummary.observation')}
                      value={scenarioForm.observation}
                      onChange={handleScenarioFormChange('observation')}
                    />
                    <TextArea
                      id="scenario-bdd"
                      label={t('storeSummary.bdd')}
                      value={scenarioForm.bdd}
                      onChange={handleScenarioFormChange('bdd')}
                    />
                    <div className="scenario-form-actions">
                      <Button
                        type="submit"
                        isLoading={isSavingScenario}
                        loadingText={t('storeSummary.saving')}
                        data-testid="save-scenario-button"
                      >
                        {editingScenarioId ? (
                          <>
                            <PencilIcon aria-hidden className="icon" />
                            {t('storeSummary.updateScenario')}
                          </>
                        ) : (
                          <>
                            <PlusCircleIcon aria-hidden className="icon" />
                            {t('storeSummary.addScenario')}
                          </>
                        )}
                      </Button>
                      {editingScenarioId && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleCancelScenarioEdit}
                          disabled={isSavingScenario}
                          data-testid="cancel-scenario-edit"
                        >
                          {t('storeSummary.editionCancelled')}
                        </Button>
                      )}
                    </div>
                  </form>
                )}

                {(viewMode === 'scenarios' || viewMode === 'suites') && (
                  <div className="scenario-table-header">
                    <div>
                      <h3 className="section-subtitle">{t('storeSummary.testData')}</h3>
                    </div>
                    <div className="scenario-table-actions">
                      {viewMode === 'scenarios' ? (
                        <>
                          <div className="scenario-action-group">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => scenarioJsonInputRef.current?.click()}
                              isLoading={isImportingScenarioJson}
                              loadingText={t('importing')}
                            >
                              <FileTextIcon aria-hidden className="icon" />
                              {t('storeSummary.importJson')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={downloadScenarioJsonTemplate}
                            >
                              <FileTextIcon aria-hidden className="icon" />
                              {t('storeSummary.downloadJsonTemplate')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleScenarioExport('xlsx')}
                              isLoading={exportingScenarioFormat === 'xlsx'}
                              loadingText={t('exporting')}
                            >
                              <FileTextIcon aria-hidden className="icon" />
                              {t('storeSummary.exportExcel')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleScenarioExport('pdf')}
                              isLoading={exportingScenarioFormat === 'pdf'}
                              loadingText={t('exporting')}
                            >
                              <FileTextIcon aria-hidden className="icon" />
                              {t('storeSummary.exportPdf')}
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
                <div className="scenario-table-wrapper">
                  {viewMode === 'scenarios' ? (
                    isLoadingScenarios ? (
                      <p className="section-subtitle">{t('storeSummary.scenariosLoading')}</p>
                    ) : scenarios.length === 0 ? (
                      <p className="section-subtitle">
                        {canManageScenarios
                          ? t('storeSummary.noScenariosManage')
                          : t('storeSummary.noScenariosRequest')}
                      </p>
                    ) : (
                      <>
                        <div className="scenario-filter-bar">
                          <input
                            type="text"
                            className="scenario-filter-input"
                            placeholder={t('storeSummary.scenarioSearch')}
                            value={scenarioFilters.search}
                            onChange={handleScenarioFilterChange('search')}
                            aria-label={t('storeSummary.scenarioSearchAriaLabel')}
                          />
                          <div className="scenario-filter-group">
                            <select
                              className="scenario-filter-input"
                              value={scenarioFilters.category}
                              onChange={handleScenarioFilterChange('category')}
                              aria-label={t('storeSummary.scenarioCategoryFilterAriaLabel')}
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
                              aria-label={t('storeSummary.scenarioCriticalityFilterAriaLabel')}
                            >
                              {criticalityFilterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {(scenarioFilters.search ||
                            scenarioFilters.category ||
                            scenarioFilters.criticality) && (
                            <button
                              type="button"
                              className="scenario-filter-clear"
                              onClick={handleClearScenarioFilters}
                            >
                              {t('storeSummary.clearFilters')}
                            </button>
                          )}
                        </div>
                        {filteredScenarios.length === 0 ? (
                          <p className="section-subtitle">
                            {t('storeSummary.noScenariosFiltered')}
                          </p>
                        ) : (
                          <>
                            <div className="table-scroll-area">
                              <table className="scenario-table data-table">
                                <thead>
                                  <tr>
                                    <th className="scenario-title-column">
                                      {t('storeSummary.scenarioTitle')}
                                    </th>
                                    <th>
                                      <ScenarioColumnSortControl
                                        label={t('storeSummary.category')}
                                        field="category"
                                        sort={scenarioSort}
                                        onChange={setScenarioSort}
                                      />
                                    </th>
                                    {viewMode === 'scenarios' && (
                                      <th>
                                        <ScenarioColumnSortControl
                                          label={t('storeSummary.automation')}
                                          field="automation"
                                          sort={scenarioSort}
                                          onChange={setScenarioSort}
                                        />
                                      </th>
                                    )}
                                    <th>{t('storeSummary.actions')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedScenarios.map((scenario) => {
                                    return (
                                      <tr key={scenario.id}>
                                        <td
                                          className="scenario-title-cell"
                                          title={scenario.title || t('storeSummary.emptyValue')}
                                        >
                                          <span className="scenario-title-text">
                                            {scenario.title || t('storeSummary.emptyValue')}
                                          </span>
                                        </td>
                                        <td>{scenario.category}</td>
                                        {viewMode === 'scenarios' && (
                                          <td>{formatAutomationLabel(scenario.automation)}</td>
                                        )}
                                        <td className="scenario-actions">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenScenarioDetails(
                                                scenario,
                                                scenario.id,
                                                'scenario-table',
                                              )
                                            }
                                            className="action-button action-button--primary"
                                          >
                                            <EyeIcon aria-hidden className="action-button__icon" />
                                            {t('storeSummary.viewDetails')}
                                          </button>
                                          {canManageScenarios && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleEditScenario(scenario)}
                                                className="action-button"
                                                aria-label={t('edit')}
                                                title={t('edit')}
                                              >
                                                <PencilIcon
                                                  aria-hidden
                                                  className="action-button__icon"
                                                />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => openDeleteScenarioModal(scenario)}
                                                className="action-button action-button--danger"
                                                aria-label={t('storeSummary.deleteScenario')}
                                                title={t('storeSummary.deleteScenario')}
                                              >
                                                <TrashIcon
                                                  aria-hidden
                                                  className="action-button__icon"
                                                />
                                              </button>
                                            </>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <PaginationControls
                              total={orderedFilteredScenarios.length}
                              visible={paginatedScenarios.length}
                              step={PAGE_SIZE}
                              onShowLess={() => setScenarioVisibleCount(PAGE_SIZE)}
                              onShowMore={() =>
                                setScenarioVisibleCount((previous) =>
                                  Math.min(previous + PAGE_SIZE, orderedFilteredScenarios.length),
                                )
                              }
                            />
                          </>
                        )}
                      </>
                    )
                  ) : viewMode === 'suites' ? (
                    <div
                      ref={suiteListRef}
                      className={`suite-manager ${isViewingSuitesOnly ? 'suite-manager--suites-only' : ''}`}
                    >
                      {isViewingSuitesOnly ? (
                        <div className="suite-cards-view">
                          <div className="suite-table-header">
                            <span className="suite-preview-title">
                              {t('storeSummary.suitesRegistered')}
                            </span>
                            <div className="suite-table-actions">
                              <BackButton
                                label={t('storeSummary.backToForm')}
                                onClick={(event) => {
                                  event.preventDefault();
                                  handleBackToSuiteForm();
                                }}
                              />
                            </div>
                          </div>
                          {isLoadingSuites ? (
                            <p className="section-subtitle">{t('storeSummary.suitesLoading')}</p>
                          ) : suites.length === 0 ? (
                            <p className="section-subtitle">{t('storeSummary.noSuites')}</p>
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
                                        {suite.scenarioIds.length} {t('storeSummary.scenario')}
                                        {suite.scenarioIds.length === 1 ? '' : 's'}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                          {!selectedSuitePreview ? (
                            <p className="section-subtitle">{t('storeSummary.suiteClick')}</p>
                          ) : orderedSuitePreviewEntries.length === 0 ? (
                            <p className="section-subtitle">{t('storeSummary.suiteNoScenarios')}</p>
                          ) : (
                            <div className="suite-preview suite-preview--cards">
                              <div className="table-scroll-area">
                                <table className="suite-preview-table data-table">
                                  <thead>
                                    <tr>
                                      <th className="scenario-title-column">
                                        {t('storeSummary.scenarioTitle')}
                                      </th>
                                      <th>
                                        <ScenarioColumnSortControl
                                          label={t('storeSummary.category')}
                                          field="category"
                                          sort={suitePreviewSort}
                                          onChange={setSuitePreviewSort}
                                        />
                                      </th>
                                      <th>
                                        <ScenarioColumnSortControl
                                          label={t('storeSummary.automation')}
                                          field="automation"
                                          sort={suitePreviewSort}
                                          onChange={setSuitePreviewSort}
                                        />
                                      </th>
                                      <th>{t('storeSummary.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paginatedSuitePreviewEntries.map(
                                      ({ scenarioId, scenario }) => {
                                        const title =
                                          scenario?.title ?? t('storeSummary.deletedScenario');
                                        return (
                                          <tr key={`${selectedSuitePreview.id}-${scenarioId}`}>
                                            <td
                                              className="scenario-title-cell"
                                              data-label={t('storeSummary.scenarioTitle')}
                                              title={title}
                                            >
                                              <span className="scenario-title-text">{title}</span>
                                            </td>
                                            <td data-label={t('storeSummary.category')}>
                                              {scenario?.category ?? t('storeSummary.emptyValue')}
                                            </td>
                                            <td data-label={t('storeSummary.automation')}>
                                              {scenario
                                                ? formatAutomationLabel(scenario.automation)
                                                : t('storeSummary.emptyValue')}
                                            </td>
                                            <td className="scenario-actions">
                                              <button
                                                type="button"
                                                className="action-button action-button--primary"
                                                onClick={() =>
                                                  handleOpenScenarioDetails(
                                                    scenario ?? null,
                                                    scenarioId,
                                                    'suite-preview',
                                                  )
                                                }
                                              >
                                                <EyeIcon
                                                  aria-hidden
                                                  className="action-button__icon"
                                                />
                                                {t('storeSummary.viewDetails')}
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      },
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <PaginationControls
                                total={orderedSuitePreviewEntries.length}
                                visible={paginatedSuitePreviewEntries.length}
                                step={PAGE_SIZE}
                                onShowLess={() => setSuitePreviewVisibleCount(PAGE_SIZE)}
                                onShowMore={() =>
                                  setSuitePreviewVisibleCount((previous) =>
                                    Math.min(
                                      previous + PAGE_SIZE,
                                      orderedSuitePreviewEntries.length,
                                    ),
                                  )
                                }
                              />
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
                                <PencilIcon aria-hidden className="icon" />
                                {t('storeSummary.suiteEdit')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => openDeleteSuiteModal(selectedSuitePreview)}
                                disabled={isSavingSuite}
                                className="suite-delete"
                              >
                                <TrashIcon aria-hidden className="icon" />
                                {t('storeSummary.deleteSuite')}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="suite-form">
                            <form
                              className="suite-card suite-editor-card create-card"
                              onSubmit={handleSuiteSubmit}
                              data-testid="suite-form"
                            >
                              <div className="suite-form-header">
                                <div>
                                  <h3 className="form-title">
                                    {editingSuiteId
                                      ? t('storeSummary.editTestSuite')
                                      : t('storeSummary.createSuiteTitle')}
                                  </h3>
                                  <p className="create-card__description">
                                    {t('storeSummary.createSuiteDescription')}
                                  </p>
                                </div>
                              </div>
                              {suiteFormError && (
                                <p className="form-message form-message--error">{suiteFormError}</p>
                              )}
                              <div className="suite-basic-info">
                                <TextInput
                                  id="suite-name"
                                  label={t('storeSummary.suiteName')}
                                  value={suiteForm.name}
                                  onChange={handleSuiteFormChange('name')}
                                  required
                                  dataTestId="suite-name"
                                />
                                <div className="suite-basic-actions">
                                  <Button
                                    type="submit"
                                    isLoading={isSavingSuite}
                                    loadingText={t('storeSummary.saving')}
                                    data-testid="save-suite-button"
                                  >
                                    {editingSuiteId ? (
                                      <>
                                        <PencilIcon aria-hidden className="icon" />
                                        {t('storeSummary.updateSuite')}
                                      </>
                                    ) : (
                                      <>
                                        <PlusCircleIcon aria-hidden className="icon" />
                                        {t('storeSummary.saveSuite')}
                                      </>
                                    )}
                                  </Button>
                                  {!editingSuiteId && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={handleShowSuitesOnly}
                                      className="suite-go-registered"
                                    >
                                      {t('storeSummary.goToRegistered')}
                                    </Button>
                                  )}
                                  {editingSuiteId && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={handleCancelSuiteEdit}
                                      disabled={isSavingSuite}
                                    >
                                      {t('storeSummary.cancelEdit')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="suite-scenario-selector">
                                <div className="suite-scenario-selector-header">
                                  <p className="field-label">
                                    {t('storeSummary.scenarioSelection')}
                                  </p>
                                  {scenarios.length === 0 && (
                                    <p className="suite-scenario-selector-description">
                                      {t('storeSummary.scenariosEmpty')}
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
                                      {t('storeSummary.selectAllScenarios')}
                                    </button>
                                    <button
                                      type="button"
                                      className="suite-selection-action suite-selection-action--ghost"
                                      onClick={handleClearSuiteSelection}
                                      disabled={suiteForm.scenarioIds.length === 0}
                                    >
                                      {t('storeSummary.clearSelection')}
                                    </button>
                                  </div>
                                )}
                                {scenarios.length === 0 ? (
                                  <p className="category-manager-empty">
                                    {t('storeSummary.noScenariosAvailable')}
                                  </p>
                                ) : (
                                  <>
                                    <div className="scenario-filter-bar suite-scenario-filters">
                                      <input
                                        type="text"
                                        className="scenario-filter-input"
                                        placeholder={t('storeSummary.scenarioSearch')}
                                        value={suiteScenarioFilters.search}
                                        onChange={handleSuiteScenarioFilterChange('search')}
                                        aria-label={t('storeSummary.scenarioSearchAriaLabel')}
                                        data-testid="suite-filter-search"
                                      />
                                      <div className="scenario-filter-group">
                                        <select
                                          className="scenario-filter-input"
                                          value={suiteScenarioFilters.category}
                                          onChange={handleSuiteScenarioFilterChange('category')}
                                          aria-label={t(
                                            'storeSummary.scenarioCategoryFilterAriaLabel',
                                          )}
                                          data-testid="suite-filter-category"
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
                                          aria-label={t(
                                            'storeSummary.scenarioCriticalityFilterAriaLabel',
                                          )}
                                          data-testid="suite-filter-criticality"
                                        >
                                          {criticalityFilterOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="suite-scenario-filters-actions">
                                        {(suiteScenarioFilters.search ||
                                          suiteScenarioFilters.category ||
                                          suiteScenarioFilters.criticality) && (
                                          <button
                                            type="button"
                                            className="scenario-filter-clear"
                                            onClick={handleClearSuiteScenarioFilters}
                                          >
                                            {t('storeSummary.clearFilters')}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {filteredSuiteScenarios.length === 0 ? (
                                      <p className="category-manager-empty">
                                        {t('storeSummary.noScenariosFiltered')}
                                      </p>
                                    ) : (
                                      <>
                                        <div className="suite-scenario-table-wrapper table-scroll-area">
                                          <table className="scenario-table suite-scenario-table data-table">
                                            <thead>
                                              <tr>
                                                <th className="suite-scenario-checkbox">
                                                  {t('select')}
                                                </th>
                                                <th className="scenario-title-column">
                                                  {t('storeSummary.scenarioTitle')}
                                                </th>
                                                <th>
                                                  <ScenarioColumnSortControl
                                                    label={t('storeSummary.category')}
                                                    field="category"
                                                    sort={suiteScenarioSort}
                                                    onChange={setSuiteScenarioSort}
                                                  />
                                                </th>
                                                <th>
                                                  <ScenarioColumnSortControl
                                                    label={t('storeSummary.automation')}
                                                    field="automation"
                                                    sort={suiteScenarioSort}
                                                    onChange={setSuiteScenarioSort}
                                                  />
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {paginatedSuiteScenarios.map((scenario) => {
                                                const isSelected = suiteForm.scenarioIds.includes(
                                                  scenario.id,
                                                );
                                                return (
                                                  <tr
                                                    key={scenario.id}
                                                    className={isSelected ? 'is-selected' : ''}
                                                  >
                                                    <td
                                                      className="suite-scenario-checkbox"
                                                      data-label={t('select')}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() =>
                                                          handleSuiteScenarioToggle(scenario.id)
                                                        }
                                                        aria-label={t(
                                                          'storeSummary.selectScenarioAriaLabel',
                                                          { scenario: scenario.title },
                                                        )}
                                                      />
                                                    </td>
                                                    <td
                                                      className="scenario-title-cell"
                                                      data-label={t('storeSummary.scenarioTitle')}
                                                      title={
                                                        scenario.title ||
                                                        t('storeSummary.emptyValue')
                                                      }
                                                    >
                                                      <span className="scenario-title-text">
                                                        {scenario.title ||
                                                          t('storeSummary.emptyValue')}
                                                      </span>
                                                    </td>
                                                    <td data-label={t('storeSummary.category')}>
                                                      {scenario.category}
                                                    </td>
                                                    <td data-label={t('storeSummary.automation')}>
                                                      {formatAutomationLabel(scenario.automation)}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                        <PaginationControls
                                          total={orderedSuiteScenarios.length}
                                          visible={paginatedSuiteScenarios.length}
                                          step={PAGE_SIZE}
                                          onShowLess={() => setSuiteScenarioVisibleCount(PAGE_SIZE)}
                                          onShowMore={() =>
                                            setSuiteScenarioVisibleCount((previous) =>
                                              Math.min(
                                                previous + PAGE_SIZE,
                                                orderedSuiteScenarios.length,
                                              ),
                                            )
                                          }
                                        />
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </form>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <EnvironmentKanban
                      storeId={storeId ?? ''}
                      storeStage={store?.stage ?? null}
                      suites={suites}
                      scenarios={scenarios}
                      environments={environments}
                      isLoading={isLoadingEnvironments}
                      onEnvironmentCreated={addEnvironment}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </Layout>

      <Modal
        isOpen={Boolean(scenarioDetails)}
        onClose={handleCloseScenarioDetails}
        title={t('storeSummary.scenarioDetailsTitle')}
      >
        {(() => {
          const detailScenario = scenarioDetails?.scenario ?? null;
          const detailTitle = detailScenario?.title ?? t('storeSummary.deletedScenario');
          const detailCategory = detailScenario?.category ?? t('storeSummary.emptyValue');
          const detailCriticality = detailScenario
            ? formatCriticalityLabel(detailScenario.criticality)
            : t('storeSummary.emptyValue');
          const detailAutomation = detailScenario
            ? formatAutomationLabel(detailScenario.automation)
            : t('storeSummary.emptyValue');
          const detailObservationValue = detailScenario?.observation?.trim() ?? '';
          const hasDetailObservation = Boolean(detailObservationValue);
          const detailBddValue = detailScenario?.bdd?.trim() ?? '';
          const localizedBdd = detailBddValue
            ? translateBddKeywords(detailBddValue, i18n.language)
            : '';
          const detailBdd = localizedBdd || t('storeSummary.emptyValue');
          const canCopyBdd = scenarioDetails?.source === 'scenario-table';
          const hasDetailBdd = Boolean(detailBddValue);
          return (
            <div className="scenario-details">
              <p className="scenario-details-title">{detailTitle}</p>
              <div className="scenario-details-grid">
                <div className="scenario-details-item">
                  <span className="scenario-details-label">{t('storeSummary.category')}</span>
                  <span className="scenario-details-value">{detailCategory}</span>
                </div>
                <div className="scenario-details-item">
                  <span className="scenario-details-label">{t('storeSummary.automation')}</span>
                  <span className="scenario-details-value">{detailAutomation}</span>
                </div>
                <div className="scenario-details-item">
                  <span className="scenario-details-label">{t('storeSummary.criticality')}</span>
                  {detailScenario ? (
                    <span
                      className={`criticality-badge scenario-details-criticality ${getCriticalityClassName(
                        detailScenario.criticality,
                      )}`}
                    >
                      {detailCriticality}
                    </span>
                  ) : (
                    <span className="scenario-details-value">{detailCriticality}</span>
                  )}
                </div>
              </div>
              {hasDetailObservation && (
                <div className="scenario-details-section">
                  <span className="scenario-details-label">{t('storeSummary.observation')}</span>
                  <LinkifiedText
                    text={detailObservationValue}
                    className="scenario-details-text"
                    as="p"
                  />
                </div>
              )}
              {hasDetailBdd && (
                <div className="scenario-details-section">
                  <div className="scenario-details-section-header">
                    <span className="scenario-details-label">{t('storeSummary.bdd')}</span>
                    {canCopyBdd && (
                      <button
                        type="button"
                        className="scenario-copy-button scenario-copy-button--with-icon"
                        onClick={() => void handleCopyBdd(localizedBdd)}
                        disabled={!hasDetailBdd}
                      >
                        <CopyIcon aria-hidden className="icon" />
                        {t('storeSummary.copyBdd')}
                      </button>
                    )}
                  </div>
                  <LinkifiedText text={detailBdd} className="scenario-details-text" as="p" />
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={isStoreSettingsOpen}
        onClose={closeStoreSettings}
        title={t('storeSummary.storeSettings')}
      >
        {storeSettingsError && (
          <p className="form-message form-message--error">{storeSettingsError}</p>
        )}
        <form
          className="form-grid"
          onSubmit={handleStoreSettingsSubmit}
          data-testid="store-settings-form"
        >
          <TextInput
            id="store-settings-name"
            label={t('storeSummary.storeName')}
            value={storeSettings.name}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, name: event.target.value }))
            }
            required
            dataTestId="store-settings-name"
          />
          <TextInput
            id="store-settings-site"
            label={t('storeSummary.storeUrl')}
            value={storeSettings.site}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, site: event.target.value }))
            }
            required
            dataTestId="store-settings-site"
          />

          <TextInput
            id="store-settings-admin-url"
            label={t('storeSummary.storeAdminUrl')}
            value={storeSettings.adminUrl}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, adminUrl: event.target.value }))
            }
            dataTestId="store-settings-admin-url"
          />
          <SelectInput
            id="store-settings-stage"
            label={t('storeSummary.storeEnvironmentLabel')}
            value={storeSettings.stage}
            onChange={(event) =>
              setStoreSettings((previous) => ({
                ...previous,
                stage: event.target.value as 'WS' | 'Preview',
              }))
            }
            options={[
              { value: 'WS', label: t('storeSummary.storePlatformVtexio') },
              { value: 'Preview', label: t('storeSummary.storePlatformFaststore') },
            ]}
          />

          <div className="organization-logo-field">
            <div className="organization-logo-preview">
              {storeSettingsLogoPreview ? (
                <img src={storeSettingsLogoPreview} alt={t('storeSummary.storeLogoPreview')} />
              ) : (
                <span className="organization-logo-fallback">
                  {t('storeSummary.storeLogoPlaceholder')}
                </span>
              )}
            </div>
            <div className="organization-logo-actions">
              <label htmlFor="store-settings-logo" className="field-label">
                {t('storeSummary.storeLogoLabel')}
              </label>
              <input
                id="store-settings-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => setStoreSettingsLogoFile(event.target.files?.[0] ?? null)}
              />
              <p className="form-hint">{t('storeSummary.storeLogoHint')}</p>
            </div>
          </div>
          <TextInput
            id="store-settings-slack-webhook"
            label={t('storeSummary.storeSlackWebhookLabel')}
            value={storeSettings.slackWebhookUrl}
            onChange={(event) =>
              setStoreSettings((previous) => ({
                ...previous,
                slackWebhookUrl: event.target.value,
              }))
            }
            placeholder={t('storeSummary.storeSlackWebhookPlaceholder')}
            dataTestId="store-settings-slack-webhook"
          />
          <p className="form-hint">{t('storeSummary.storeSlackWebhookHint')}</p>
          <div className="form-actions">
            <Button
              type="submit"
              isLoading={isUpdatingStore}
              loadingText={t('storeSummary.saving')}
              data-testid="save-store-settings"
            >
              {t('storeSummary.saveChanges')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreSettings}
              disabled={isUpdatingStore}
              data-testid="cancel-store-settings"
            >
              {t('cancel')}
            </Button>
          </div>
        </form>

        <div className="modal-danger-zone">
          <div>
            <h4>{t('storeSummary.removeStore')}</h4>
            <p>{t('storeSummary.removeStoreWarning')}</p>
          </div>
          <button
            type="button"
            className="link-danger"
            onClick={openDeleteStoreModal}
            disabled={isDeletingStore}
            data-testid="delete-store-button"
          >
            {t('storeSummary.removeStore')}
          </button>
        </div>
      </Modal>
      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmation)}
        message={deleteConfirmation?.message}
        description={deleteConfirmation?.description}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </>
  );
};
