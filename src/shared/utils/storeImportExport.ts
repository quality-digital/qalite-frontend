import type {
  StoreExportPayload,
  StoreSuiteExportPayload,
} from '../../application/services/StoreService';
import type { StoreScenario } from '../../domain/entities/Store';

export const downloadJsonFile = (data: unknown, fileName: string) => {
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

export const validateScenarioImportPayload = (payload: StoreExportPayload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Arquivo inválido.');
  }

  if (!payload.store || typeof payload.store !== 'object') {
    throw new Error('Arquivo não possui informações da loja.');
  }

  const requiredStoreFields: (keyof StoreExportPayload['store'])[] = [
    'id',
    'name',
    'site',
    'scenarioCount',
  ];
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
      'bdd',
    ];

    requiredScenarioFields.forEach((field) => {
      const value = scenario[field];
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Cenário inválido. O campo "${field}" é obrigatório.`);
      }
    });
  });
};

export const validateSuiteImportPayload = (payload: StoreSuiteExportPayload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Arquivo inválido.');
  }

  if (!payload.store || typeof payload.store !== 'object') {
    throw new Error('Arquivo não possui informações da loja.');
  }

  if (!Array.isArray(payload.suites)) {
    throw new Error('Estrutura de suítes inválida.');
  }

  payload.suites.forEach((suite) => {
    if (typeof suite.name !== 'string' || !suite.name.trim()) {
      throw new Error('O nome da suíte é obrigatório.');
    }

    if (typeof suite.description !== 'string') {
      throw new Error('A descrição da suíte é obrigatória.');
    }

    if (!Array.isArray(suite.scenarios)) {
      throw new Error(`Estrutura de cenários inválida na suíte "${suite.name}".`);
    }

    suite.scenarios.forEach((scenario) => {
      if (!scenario || typeof scenario !== 'object') {
        throw new Error('Cenário inválido encontrado na importação de suítes.');
      }

      if (typeof scenario.title !== 'string' || !scenario.title.trim()) {
        throw new Error('Cenário inválido. O título é obrigatório.');
      }

      if (scenario.id !== null && scenario.id !== undefined && typeof scenario.id !== 'string') {
        throw new Error('Identificador do cenário inválido.');
      }
    });
  });
};
