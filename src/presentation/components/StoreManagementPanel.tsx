import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  Store,
  StoreCategory,
  StoreScenario,
  StoreScenarioInput,
} from '../../domain/entities/store';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { useToast } from '../context/ToastContext';
import { Button } from './Button';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { PaginationControls } from './PaginationControls';
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';
import { SelectInput } from './SelectInput';
import { LinkifiedText } from './LinkifiedText';
import {
  AUTOMATION_OPTIONS,
  CRITICALITY_OPTIONS,
  getAutomationLabelKey,
  getCriticalityLabelKey,
  getCriticalityClassName,
} from '../constants/scenarioOptions';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../shared/utils/scenarioEnums';
import {
  ScenarioColumnSortControl,
  sortScenarioList,
  type ScenarioSortConfig,
} from './ScenarioColumnSortControl';
import { downloadScenarioWorkbook, openScenarioPdf } from '../../shared/utils/storeImportExport';
import { buildExternalLink } from '../utils/externalLink';
import { FileTextIcon, PencilIcon, TrashIcon } from './icons';

interface StoreManagementPanelProps {
  organizationId: string;
  organizationName: string;
  canManageStores: boolean;
  canManageScenarios: boolean;
  showScenarioForm?: boolean;
}

type ExportFormat = 'pdf' | 'xlsx';

const emptyScenarioForm: StoreScenarioInput = {
  title: '',
  category: '',
  automation: '',
  criticality: '',
  observation: '',
  bdd: '',
};

const PAGE_SIZE = 20;

export const StoreManagementPanel = ({
  organizationId,
  organizationName,
  canManageStores,
  canManageScenarios,
  showScenarioForm = true,
}: StoreManagementPanelProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storeFormMode, setStoreFormMode] = useState<'hidden' | 'create' | 'edit'>('hidden');
  const [storeForm, setStoreForm] = useState({ name: '', site: '' });
  const [storeFormError, setStoreFormError] = useState<string | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [scenarioForm, setScenarioForm] = useState<StoreScenarioInput>(emptyScenarioForm);
  const [scenarioFormError, setScenarioFormError] = useState<string | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSyncingLegacyCategories, setIsSyncingLegacyCategories] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isCategoryListCollapsed, setIsCategoryListCollapsed] = useState(true);
  const [isScenarioTableCollapsed, setIsScenarioTableCollapsed] = useState(false);
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const scenarioFormRef = useRef<HTMLFormElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const canUseScenarioForm = canManageScenarios && showScenarioForm !== false;
  const canToggleCategoryList =
    !isLoadingCategories && !isSyncingLegacyCategories && categories.length > 0;

  const scenarioCategories = useMemo(
    () =>
      new Set(
        scenarios
          .map((scenario) => scenario.category.trim())
          .filter((category) => category.length > 0),
      ),
    [scenarios],
  );

  const displayedScenarios = useMemo(
    () => sortScenarioList(scenarios, scenarioSort),
    [scenarioSort, scenarios],
  );
  const paginatedScenarios = useMemo(
    () => displayedScenarios.slice(0, visibleCount),
    [displayedScenarios, visibleCount],
  );
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [scenarioSort, scenarios.length]);

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
        showToast({
          type: 'error',
          message: t('storeManagement.storeListLoadError'),
        });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [organizationId, showToast, t]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, stores],
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
        showToast({
          type: 'error',
          message: t('storeManagement.scenarioListLoadError'),
        });
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    void fetchScenarios();
  }, [selectedStore, showToast, t]);

  useEffect(() => {
    if (!selectedStore) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }

    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const data = await storeService.listCategories(selectedStore.id);
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
  }, [selectedStore, showToast, t]);

  useEffect(() => {
    setIsCategoryListCollapsed(true);
    setScenarioSort(null);
  }, [selectedStoreId]);

  useEffect(() => {
    if (
      !selectedStore?.id ||
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
              storeId: selectedStore.id,
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
    selectedStore?.id,
  ]);

  useEffect(() => {
    setNewCategoryName('');
    setCategoryError(null);
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setUpdatingCategoryId(null);
    setDeletingCategoryId(null);
    setIsCreatingCategory(false);
    setIsSyncingLegacyCategories(false);
  }, [selectedStore?.id]);

  useEffect(() => {
    if (scenarios.length === 0) {
      setIsScenarioTableCollapsed(false);
    }
  }, [scenarios.length]);

  const resetStoreForm = () => {
    setStoreForm({ name: '', site: '' });
    setStoreFormMode('hidden');
    setStoreFormError(null);
  };

  const handleStartCreateStore = () => {
    setStoreForm({ name: '', site: '' });
    setStoreFormMode('create');
    setStoreFormError(null);
  };

  const handleStartEditStore = (store: Store) => {
    setStoreForm({ name: store.name, site: store.site });
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
    const stageValue = storeFormMode === 'edit' && selectedStore ? selectedStore.stage : '';

    if (!trimmedName) {
      setStoreFormError(t('storeSummary.storeNameRequired'));
      return;
    }

    if (!trimmedSite) {
      setStoreFormError(t('storeSummary.storeSiteRequired'));
      return;
    }

    try {
      setIsSavingStore(true);
      if (storeFormMode === 'create') {
        const created = await storeService.create({
          organizationId,
          name: trimmedName,
          site: trimmedSite,
          stage: '',
        });

        setStores((previous) =>
          [...previous, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedStoreId(created.id);
        resetStoreForm();
        showToast({ type: 'success', message: t('storeManagement.storeCreateSuccess') });
        return;
      }

      if (storeFormMode === 'edit' && selectedStore) {
        const updated = await storeService.update(selectedStore.id, {
          name: trimmedName,
          site: trimmedSite,
          stage: stageValue,
        });

        setStores((previous) =>
          previous
            .map((store) =>
              store.id === updated.id ? { ...updated, scenarioCount: store.scenarioCount } : store,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        showToast({ type: 'success', message: t('storeSummary.storeUpdateSuccess') });
        resetStoreForm();
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeManagement.storeSaveError');
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
      showToast({ type: 'success', message: t('storeSummary.storeRemoveSuccess') });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.storeRemoveError');
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleScenarioFormChange =
    (field: keyof StoreScenarioInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setScenarioForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleCreateCategory = async () => {
    if (!selectedStore) {
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
        storeId: selectedStore.id,
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
    if (!selectedStore || !editingCategoryId) {
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
      const updated = await storeService.updateCategory(selectedStore.id, editingCategoryId, {
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
    if (!selectedStore) {
      return;
    }

    try {
      setDeletingCategoryId(category.id);
      await storeService.deleteCategory(selectedStore.id, category.id);
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

  const handleScenarioSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScenarioFormError(null);

    if (!selectedStore || !canManageScenarios) {
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
          selectedStore.id,
          editingScenarioId,
          trimmedScenario,
        );
        setScenarios((previous) =>
          previous.map((scenario) => (scenario.id === updated.id ? updated : scenario)),
        );
        showToast({ type: 'success', message: t('storeSummary.scenarioUpdateSuccess') });
      } else {
        const created = await storeService.createScenario({
          storeId: selectedStore.id,
          ...trimmedScenario,
        });
        setScenarios((previous) => [...previous, created]);
        setStores((previous) =>
          previous.map((store) =>
            store.id === selectedStore.id
              ? { ...store, scenarioCount: store.scenarioCount + 1 }
              : store,
          ),
        );
        showToast({ type: 'success', message: t('storeSummary.scenarioCreateSuccess') });
      }

      setScenarioForm(emptyScenarioForm);
      setEditingScenarioId(null);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.scenarioSaveError');
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
    if (!canManageScenarios || !selectedStore) {
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
            : store,
        ),
      );
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

  const openDeleteStoreModal = (store: Store) => {
    setDeleteConfirmation({
      message: t('storeSummary.storeDeleteConfirm', { name: store.name }),
      description: t('storeSummary.storeDeleteWarning'),
      onConfirm: () => handleDeleteStore(store),
    });
  };

  const openDeleteCategoryModal = (category: StoreCategory) => {
    if (!selectedStore) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.categoryDeleteConfirm', { name: category.name }),
      description: t('storeSummary.categoryDeleteWarning'),
      onConfirm: () => handleDeleteCategory(category),
    });
  };

  const openDeleteScenarioModal = (scenario: StoreScenario) => {
    if (!selectedStore || !canManageScenarios) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.scenarioDeleteConfirm', { title: scenario.title }),
      onConfirm: () => handleDeleteScenario(scenario),
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

  const handleExport = async (format: ExportFormat) => {
    if (!selectedStore) {
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
        `<p style='font-family: Inter, system-ui, -apple-system, sans-serif; padding: 24px;'>${t('storeSummary.pdfGenerating')}</p>`,
      );
      pdfWindow.document.close();
    }

    try {
      setExportingFormat(format);
      const data = await storeService.exportStore(selectedStore.id);
      const baseFileName = `${selectedStore.name.replace(/\s+/g, '_')}_${t('storeManagement.exportFileSuffix')}`;

      if (format === 'xlsx') {
        downloadScenarioWorkbook(data, `${baseFileName}.xlsx`);
      }

      if (format === 'pdf') {
        openScenarioPdf(
          data,
          t('storeManagement.exportTitle', { name: selectedStore.name }),
          pdfWindow,
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
      setExportingFormat(null);
    }
  };

  return (
    <section className="store-management">
      <div className="card store-management-sidebar">
        <div className="store-management-header">
          <div>
            <h2 className="text-xl font-semibold text-primary">
              {t('storeManagement.organizationStoresTitle')}
            </h2>
            <p className="section-subtitle">
              {t('storeManagement.organizationStoreCount', {
                organizationName,
                count: stores.length,
              })}
            </p>
          </div>
          {canManageStores && (
            <Button type="button" variant="secondary" onClick={handleStartCreateStore}>
              {t('storeManagement.newStore')}
            </Button>
          )}
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">{t('storeManagement.loadingStores')}</p>
        ) : stores.length === 0 ? (
          <p className="section-subtitle">
            {canManageStores
              ? t('storeManagement.emptyStoresManage')
              : t('storeManagement.emptyStoresView')}
          </p>
        ) : (
          <ul className="store-list">
            {stores.map((store) => {
              const isActive = store.id === selectedStoreId;
              const storeSite = buildExternalLink(store.site);
              const storeSiteLabel = storeSite.label || t('storeSummary.notProvided');
              return (
                <li
                  key={store.id}
                  className={`store-list-item${isActive ? ' store-list-item--active' : ''}`}
                >
                  <div className="store-list-body">
                    <button
                      type="button"
                      className="store-list-button"
                      onClick={() => setSelectedStoreId(store.id)}
                    >
                      <div className="store-list-meta">
                        <h3>{store.name}</h3>
                      </div>
                      <span className="store-list-count">
                        {t('storeManagement.scenarioCount', { count: store.scenarioCount })}
                      </span>
                    </button>
                    <div className="store-list-site">
                      {storeSite.href ? (
                        <a
                          href={storeSite.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-link"
                        >
                          {storeSiteLabel}
                        </a>
                      ) : (
                        <span>{storeSiteLabel}</span>
                      )}
                    </div>
                  </div>
                  {canManageStores && (
                    <div className="store-list-actions">
                      <button
                        type="button"
                        onClick={() => handleStartEditStore(store)}
                        disabled={isSavingStore}
                        className="action-button"
                      >
                        <PencilIcon aria-hidden className="action-button__icon" />
                        {t('edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteStoreModal(store)}
                        disabled={isSavingStore}
                        className="action-button action-button--danger"
                      >
                        <TrashIcon aria-hidden className="action-button__icon" />
                        {t('delete')}
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
            <h3 className="form-title">
              {storeFormMode === 'create'
                ? t('storeManagement.storeFormTitleCreate')
                : t('storeManagement.storeFormTitleEdit')}
            </h3>
            {storeFormError && <p className="form-message form-message--error">{storeFormError}</p>}
            <TextInput
              id="store-name"
              label={t('storeManagement.storeNameLabel')}
              value={storeForm.name}
              onChange={(event) =>
                setStoreForm((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder={t('storeManagement.storeNamePlaceholder')}
              required
            />
            <TextInput
              id="store-site"
              label={t('storeManagement.storeSiteLabel')}
              value={storeForm.site}
              onChange={(event) =>
                setStoreForm((previous) => ({ ...previous, site: event.target.value }))
              }
              placeholder={t('storeManagement.storeSitePlaceholder')}
              required
            />
            <div className="store-form-actions">
              <Button type="submit" isLoading={isSavingStore} loadingText={t('saving')}>
                {storeFormMode === 'create'
                  ? t('storeManagement.storeSaveCreate')
                  : t('storeManagement.storeSaveUpdate')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetStoreForm}
                disabled={isSavingStore}
              >
                {t('cancel')}
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
                  {(() => {
                    const site = buildExternalLink(selectedStore.site);
                    const siteLabel = site.label || t('storeSummary.notProvided');
                    return site.href ? (
                      <a
                        href={site.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-link"
                      >
                        {siteLabel}
                      </a>
                    ) : (
                      siteLabel
                    );
                  })()}
                </p>
              </div>
              <div className="store-details-actions">
                <div className="store-action-group">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleExport('xlsx')}
                    isLoading={exportingFormat === 'xlsx'}
                    loadingText={t('exporting')}
                  >
                    {t('storeManagement.exportExcel')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleExport('pdf')}
                    isLoading={exportingFormat === 'pdf'}
                    loadingText={t('exporting')}
                  >
                    <FileTextIcon aria-hidden className="icon" />
                    {t('storeSummary.exportPdf')}
                  </Button>
                </div>
              </div>
            </div>

            {canUseScenarioForm && (
              <form ref={scenarioFormRef} className="scenario-form" onSubmit={handleScenarioSubmit}>
                <h3 className="form-title">
                  {editingScenarioId
                    ? t('storeManagement.scenarioFormTitleEdit')
                    : t('storeManagement.scenarioFormTitleCreate')}
                </h3>
                {scenarioFormError && (
                  <p className="form-message form-message--error">{scenarioFormError}</p>
                )}
                <TextInput
                  id="scenario-title"
                  label={t('storeSummary.title')}
                  value={scenarioForm.title}
                  onChange={handleScenarioFormChange('title')}
                  required
                />
                <div className="scenario-form-grid">
                  <SelectInput
                    id="scenario-category"
                    label={t('storeSummary.category')}
                    value={scenarioForm.category}
                    onChange={handleScenarioFormChange('category')}
                    options={categorySelectOptions}
                    required
                  />
                  <SelectInput
                    id="scenario-automation"
                    label={t('storeSummary.automation')}
                    value={scenarioForm.automation}
                    onChange={handleScenarioFormChange('automation')}
                    options={automationSelectOptions}
                    required
                  />
                  <SelectInput
                    id="scenario-criticality"
                    label={t('storeSummary.criticality')}
                    value={scenarioForm.criticality}
                    onChange={handleScenarioFormChange('criticality')}
                    options={criticalitySelectOptions}
                    required
                  />
                </div>
                <div className="category-manager">
                  <div className="category-manager-header">
                    <div className="category-manager-header-text">
                      <p className="field-label">{t('storeManagement.categoryManagerTitle')}</p>
                      <p className="category-manager-description">
                        {t('storeManagement.categoryManagerDescription')}
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
                          ? t('storeManagement.categoryListExpand')
                          : t('storeManagement.categoryListCollapse')}
                      </button>
                    )}
                  </div>
                  <div className="category-manager-actions">
                    <input
                      type="text"
                      className="field-input"
                      placeholder={
                        selectedStore
                          ? t('storeManagement.categoryPlaceholder')
                          : t('storeManagement.categorySelectStorePlaceholder')
                      }
                      value={newCategoryName}
                      onChange={(event) => {
                        setNewCategoryName(event.target.value);
                        setCategoryError(null);
                      }}
                      disabled={!selectedStore}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCreateCategory}
                      isLoading={isCreatingCategory}
                      loadingText={t('saving')}
                      disabled={!selectedStore || isLoadingCategories || isSyncingLegacyCategories}
                    >
                      {t('storeManagement.addCategory')}
                    </Button>
                  </div>
                  {categoryError && (
                    <p className="form-message form-message--error">{categoryError}</p>
                  )}
                  {isLoadingCategories || isSyncingLegacyCategories ? (
                    <p className="category-manager-description">
                      {t('storeManagement.loadingCategories')}
                    </p>
                  ) : isCategoryListCollapsed && categories.length > 0 ? (
                    <p className="category-manager-description category-manager-collapsed-message">
                      {t('storeManagement.categoryListCollapsed')}
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
                                    loadingText={t('saving')}
                                  >
                                    {t('storeManagement.saveCategory')}
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
                                <span className="category-manager-item-name">{category.name}</span>
                                <div className="category-manager-item-actions">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleStartEditCategory(category)}
                                    disabled={deletingCategoryId === category.id}
                                  >
                                    {t('edit')}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => openDeleteCategoryModal(category)}
                                    disabled={deletingCategoryId === category.id || isCategoryUsed}
                                    isLoading={deletingCategoryId === category.id}
                                    loadingText={t('deleteLoading')}
                                    title={
                                      isCategoryUsed
                                        ? t('storeManagement.categoryRemoveBlocked')
                                        : undefined
                                    }
                                  >
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
                    <p className="category-manager-empty">{t('storeManagement.emptyCategories')}</p>
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
                  <Button type="submit" isLoading={isSavingScenario} loadingText={t('saving')}>
                    {editingScenarioId
                      ? t('storeManagement.scenarioUpdateAction')
                      : t('storeManagement.scenarioCreateAction')}
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
                      {t('storeManagement.cancelScenarioEdit')}
                    </Button>
                  )}
                </div>
              </form>
            )}

            <div className="scenario-table-header">
              <h3 className="section-subtitle">{t('storeManagement.scenarioTableTitle')}</h3>
              {scenarios.length > 0 && (
                <button
                  type="button"
                  className="scenario-table-toggle"
                  onClick={() => setIsScenarioTableCollapsed((previous) => !previous)}
                >
                  {isScenarioTableCollapsed
                    ? t('storeManagement.scenarioTableExpand')
                    : t('storeManagement.scenarioTableCollapse')}
                </button>
              )}
            </div>
            <div className="scenario-table-wrapper">
              {isScenarioTableCollapsed ? (
                <p className="section-subtitle">{t('storeManagement.scenarioTableCollapsed')}</p>
              ) : isLoadingScenarios ? (
                <p className="section-subtitle">{t('storeManagement.loadingScenarios')}</p>
              ) : scenarios.length === 0 ? (
                <p className="section-subtitle">
                  {canUseScenarioForm
                    ? t('storeManagement.emptyScenariosManage')
                    : t('storeManagement.emptyScenariosView')}
                </p>
              ) : (
                <table className="scenario-table data-table">
                  <thead>
                    <tr>
                      <th>{t('storeSummary.title')}</th>
                      <th>
                        <ScenarioColumnSortControl
                          label={t('storeSummary.category')}
                          field="category"
                          sort={scenarioSort}
                          onChange={setScenarioSort}
                        />
                      </th>
                      <th>
                        <ScenarioColumnSortControl
                          label={t('storeSummary.automation')}
                          field="automation"
                          sort={scenarioSort}
                          onChange={setScenarioSort}
                        />
                      </th>
                      <th>
                        <ScenarioColumnSortControl
                          label={t('storeSummary.criticality')}
                          field="criticality"
                          sort={scenarioSort}
                          onChange={setScenarioSort}
                        />
                      </th>
                      <th>{t('storeSummary.observation')}</th>
                      <th>{t('storeSummary.bdd')}</th>
                      {canUseScenarioForm && <th>{t('storeManagement.actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedScenarios.map((scenario) => {
                      const hasBdd = Boolean(scenario.bdd?.trim());

                      return (
                        <tr key={scenario.id}>
                          <td>{scenario.title}</td>
                          <td>{scenario.category}</td>
                          <td>{formatAutomationLabel(scenario.automation)}</td>
                          <td>
                            <span
                              className={`criticality-badge ${getCriticalityClassName(scenario.criticality)}`}
                            >
                              {formatCriticalityLabel(scenario.criticality)}
                            </span>
                          </td>
                          <td className="scenario-observation">
                            {scenario.observation?.trim() ? (
                              <LinkifiedText
                                text={scenario.observation}
                                className="scenario-details-text"
                              />
                            ) : (
                              t('storeManagement.emptyValue')
                            )}
                          </td>
                          <td className="scenario-bdd">
                            {hasBdd ? (
                              <LinkifiedText
                                text={scenario.bdd ?? ''}
                                className="scenario-details-text"
                              />
                            ) : (
                              <span className="scenario-bdd--empty">
                                {t('storeManagement.emptyValue')}
                              </span>
                            )}
                          </td>
                          {canUseScenarioForm && (
                            <td className="scenario-actions">
                              <button
                                type="button"
                                onClick={() => handleEditScenario(scenario)}
                                disabled={isSavingScenario}
                                className="action-button"
                              >
                                <PencilIcon aria-hidden className="action-button__icon" />
                                {t('edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteScenarioModal(scenario)}
                                disabled={isSavingScenario}
                                className="action-button action-button--danger"
                              >
                                <TrashIcon aria-hidden className="action-button__icon" />
                                {t('delete')}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {!isScenarioTableCollapsed && scenarios.length > 0 && (
              <PaginationControls
                total={displayedScenarios.length}
                visible={paginatedScenarios.length}
                step={PAGE_SIZE}
                onShowLess={() => setVisibleCount(PAGE_SIZE)}
                onShowMore={() =>
                  setVisibleCount((previous) =>
                    Math.min(previous + PAGE_SIZE, displayedScenarios.length),
                  )
                }
              />
            )}
          </>
        ) : (
          <div className="store-empty">
            <h2 className="text-xl font-semibold text-primary">
              {t('storeManagement.selectStoreTitle')}
            </h2>
            <p className="section-subtitle">
              {canManageStores
                ? t('storeManagement.selectStoreManageDescription')
                : t('storeManagement.selectStoreViewDescription')}
            </p>
          </div>
        )}
      </div>
      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmation)}
        message={deleteConfirmation?.message}
        description={deleteConfirmation?.description}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </section>
  );
};
