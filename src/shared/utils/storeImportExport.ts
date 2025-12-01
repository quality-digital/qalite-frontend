import type { StoreScenario } from '../../domain/entities/store';
import type {
  StoreExportPayload,
  StoreSuiteExportPayload,
} from '../../infrastructure/external/stores';

export const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadMarkdownFile = (content: string, fileName: string) => {
  downloadTextFile(content, fileName, 'text/markdown');
};

export const downloadJsonFile = (content: string, fileName: string) => {
  downloadTextFile(content, fileName, 'application/json');
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const openPdfFromMarkdown = (
  content: string,
  title: string,
  targetWindow?: Window | null,
) => {
  const printableWindow = targetWindow ?? window.open('', '_blank');

  if (!printableWindow) {
    throw new Error('Não foi possível abrir a visualização para exportar em PDF.');
  }

  const escapedContent = escapeHtml(content);
  printableWindow.document.open();
  printableWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; }
          pre { white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.5; }
          h1 { margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <pre>${escapedContent}</pre>
      </body>
    </html>
  `);

  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
};

const buildScenarioSummary = (payload: StoreExportPayload) => {
  const scenarioLines = payload.scenarios.map((scenario, index) =>
    [
      `### ${index + 1}. ${scenario.title}`,
      `- Categoria: ${scenario.category}`,
      `- Automação: ${scenario.automation}`,
      `- Criticidade: ${scenario.criticality}`,
      scenario.observation ? `- Observação: ${scenario.observation}` : '- Observação: —',
      scenario.bdd ? `- BDD:\n\n${scenario.bdd}` : '- BDD: —',
    ].join('\n'),
  );

  return [
    `# Massa de cenários - ${payload.store.name}`,
    `- Loja: ${payload.store.name}`,
    `- Site: ${payload.store.site}`,
    `- Ambiente: ${payload.store.stage || 'Não informado'}`,
    `- Quantidade de cenários: ${payload.scenarios.length}`,
    `- Exportado em: ${new Date(payload.exportedAt).toLocaleString('pt-BR')}`,
    '',
    '## Cenários',
    ...scenarioLines,
  ].join('\n\n');
};

const buildSuiteSummary = (payload: StoreSuiteExportPayload) => {
  const suiteLines = payload.suites.map((suite, index) => {
    const scenarioList = suite.scenarios
      .map((scenario, scenarioIndex) => `  ${scenarioIndex + 1}. ${scenario.title || '—'}`)
      .join('\n');

    return [
      `### ${index + 1}. ${suite.name}`,
      suite.description ? `- Descrição: ${suite.description}` : '- Descrição: —',
      '- Cenários:',
      scenarioList || '  —',
    ].join('\n');
  });

  return [
    `# Suítes de testes - ${payload.store.name}`,
    `- Loja: ${payload.store.name}`,
    `- Site: ${payload.store.site}`,
    `- Ambiente: ${payload.store.stage || 'Não informado'}`,
    `- Quantidade de suítes: ${payload.suites.length}`,
    `- Quantidade de cenários: ${payload.store.scenarioCount}`,
    `- Exportado em: ${new Date(payload.exportedAt).toLocaleString('pt-BR')}`,
    '',
    '## Suítes',
    ...suiteLines,
  ].join('\n\n');
};

export const buildScenarioMarkdown = (payload: StoreExportPayload) => buildScenarioSummary(payload);

export const buildSuiteMarkdown = (payload: StoreSuiteExportPayload) => buildSuiteSummary(payload);

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
    ];

    requiredScenarioFields.forEach((field) => {
      const value = scenario[field];
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Cenário inválido. O campo "${field}" é obrigatório.`);
      }
    });

    ['observation', 'bdd'].forEach((field) => {
      const value = scenario[field as 'observation' | 'bdd'];
      if (value !== undefined && typeof value !== 'string') {
        throw new Error(`Cenário inválido. O campo "${field}" deve ser um texto.`);
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
