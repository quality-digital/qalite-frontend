import type {
  StoreExportPayload,
  StoreScenario,
  StoreSuiteExportPayload,
} from '../../domain/entities/store';

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

const textEncoder = new TextEncoder();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toColumnName = (index: number): string => {
  let dividend = index + 1;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
};

const buildWorksheetXml = (rows: string[][]) => {
  const sheetData = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map(
            (cell, columnIndex) =>
              `<c r="${toColumnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
                cell,
              )}</t></is></c>`,
          )
          .join('')}</row>`,
    )
    .join('');

  const lastColumn = rows[0]?.length ? toColumnName(rows[0].length - 1) : 'A';
  const lastRow = rows.length || 1;

  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}" />
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
};

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const calculateCrc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

interface ZipEntry {
  path: string;
  data: Uint8Array;
}

const buildZipFile = (entries: ZipEntry[]): Uint8Array => {
  const localFileRecords: Uint8Array[] = [];
  const centralDirectoryRecords: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry, index) => {
    const fileName = textEncoder.encode(entry.path);
    const crc = calculateCrc32(entry.data);
    const localHeader = new ArrayBuffer(30);
    const localHeaderView = new DataView(localHeader);

    localHeaderView.setUint32(0, 0x04034b50, true);
    localHeaderView.setUint16(4, 20, true);
    localHeaderView.setUint16(6, 0, true);
    localHeaderView.setUint16(8, 0, true);
    localHeaderView.setUint16(10, 0, true);
    localHeaderView.setUint16(12, 0, true);
    localHeaderView.setUint32(14, crc, true);
    localHeaderView.setUint32(18, entry.data.length, true);
    localHeaderView.setUint32(22, entry.data.length, true);
    localHeaderView.setUint16(26, fileName.length, true);
    localHeaderView.setUint16(28, 0, true);

    const localRecord = new Uint8Array(30 + fileName.length + entry.data.length);
    localRecord.set(new Uint8Array(localHeader), 0);
    localRecord.set(fileName, 30);
    localRecord.set(entry.data, 30 + fileName.length);
    localFileRecords.push(localRecord);

    const centralHeader = new ArrayBuffer(46);
    const centralHeaderView = new DataView(centralHeader);
    centralHeaderView.setUint32(0, 0x02014b50, true);
    centralHeaderView.setUint16(4, 20, true);
    centralHeaderView.setUint16(6, 20, true);
    centralHeaderView.setUint16(8, 0, true);
    centralHeaderView.setUint16(10, 0, true);
    centralHeaderView.setUint16(12, 0, true);
    centralHeaderView.setUint16(14, 0, true);
    centralHeaderView.setUint32(16, crc, true);
    centralHeaderView.setUint32(20, entry.data.length, true);
    centralHeaderView.setUint32(24, entry.data.length, true);
    centralHeaderView.setUint16(28, fileName.length, true);
    centralHeaderView.setUint16(30, 0, true);
    centralHeaderView.setUint16(32, 0, true);
    centralHeaderView.setUint16(34, 0, true);
    centralHeaderView.setUint16(36, 0, true);
    centralHeaderView.setUint32(38, 0, true);
    centralHeaderView.setUint32(42, offset, true);

    const centralRecord = new Uint8Array(46 + fileName.length);
    centralRecord.set(new Uint8Array(centralHeader), 0);
    centralRecord.set(fileName, 46);
    centralDirectoryRecords.push(centralRecord);

    offset += localRecord.length;
    if (index === entries.length - 1) {
      return;
    }
  });

  const centralDirectorySize = centralDirectoryRecords.reduce(
    (size, record) => size + record.length,
    0,
  );
  const centralDirectoryOffset = offset;

  const endRecord = new ArrayBuffer(22);
  const endRecordView = new DataView(endRecord);
  endRecordView.setUint32(0, 0x06054b50, true);
  endRecordView.setUint16(4, 0, true);
  endRecordView.setUint16(6, 0, true);
  endRecordView.setUint16(8, entries.length, true);
  endRecordView.setUint16(10, entries.length, true);
  endRecordView.setUint32(12, centralDirectorySize, true);
  endRecordView.setUint32(16, centralDirectoryOffset, true);
  endRecordView.setUint16(20, 0, true);

  const totalSize = offset + centralDirectorySize + endRecord.byteLength;
  const zip = new Uint8Array(totalSize);
  let currentOffset = 0;

  localFileRecords.forEach((record) => {
    zip.set(record, currentOffset);
    currentOffset += record.length;
  });

  centralDirectoryRecords.forEach((record) => {
    zip.set(record, currentOffset);
    currentOffset += record.length;
  });

  zip.set(new Uint8Array(endRecord), currentOffset);

  return zip;
};

interface WorksheetDefinition {
  name: string;
  rows: string[][];
}

const buildWorkbookZip = (sheets: WorksheetDefinition[], createdAt: string): Uint8Array => {
  const sheetXmlEntries = sheets.map((sheet) => buildWorksheetXml(sheet.rows));

  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}" />`,
      )
      .join('')}
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml" />`,
    )
    .join('')}
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="xml" ContentType="application/xml" />
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" />
  ${sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" />`,
    )
    .join('')}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml" />
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml" />
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml" />
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml" />
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml" />
</Relationships>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>QAlite</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant>
        <vt:lpstr>Worksheets</vt:lpstr>
      </vt:variant>
      <vt:variant>
        <vt:i4>${sheets.length}</vt:i4>
      </vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">
      ${sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join('')}
    </vt:vector>
  </TitlesOfParts>
</Properties>`;

  const coreXml = `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>QAlite</dc:creator>
  <cp:lastModifiedBy>QAlite</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`;

  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml) },
    { path: '_rels/.rels', data: textEncoder.encode(rootRelsXml) },
    { path: 'docProps/app.xml', data: textEncoder.encode(appXml) },
    { path: 'docProps/core.xml', data: textEncoder.encode(coreXml) },
    { path: 'xl/workbook.xml', data: textEncoder.encode(workbookXml) },
    { path: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml) },
    ...sheetXmlEntries.map((content, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: textEncoder.encode(content),
    })),
  ];

  return buildZipFile(entries);
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('pt-BR');

const createWorkbookBlob = (sheets: WorksheetDefinition[], exportedAt: string) => {
  const workbookContent = buildWorkbookZip(sheets, exportedAt);
  const normalizedBuffer = new Uint8Array(workbookContent).buffer;
  return new Blob([normalizedBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

const buildScenarioSheets = (payload: StoreExportPayload): WorksheetDefinition[] => {
  const summaryRows: string[][] = [
    ['Loja', payload.store.name],
    ['Site', payload.store.site],
    ['Ambiente', payload.store.stage || 'Não informado'],
    ['Quantidade de cenários', `${payload.scenarios.length}`],
    ['Exportado em', formatDateTime(payload.exportedAt)],
  ];

  const scenarioRows: string[][] = [
    ['#', 'Título', 'Categoria', 'Automação', 'Criticidade', 'Observação', 'BDD'],
    ...payload.scenarios.map((scenario: StoreScenario, index: number) => [
      `${index + 1}`,
      scenario.title || '—',
      scenario.category || '—',
      scenario.automation || '—',
      scenario.criticality || '—',
      scenario.observation || '—',
      scenario.bdd || '—',
    ]),
  ];

  return [
    { name: 'Resumo', rows: summaryRows },
    { name: 'Cenários', rows: scenarioRows },
  ];
};

const buildSuiteSheets = (payload: StoreSuiteExportPayload): WorksheetDefinition[] => {
  const summaryRows: string[][] = [
    ['Loja', payload.store.name],
    ['Site', payload.store.site],
    ['Ambiente', payload.store.stage || 'Não informado'],
    ['Quantidade de suítes', `${payload.suites.length}`],
    ['Quantidade de cenários', `${payload.store.scenarioCount}`],
    ['Exportado em', formatDateTime(payload.exportedAt)],
  ];

  const suiteRows: string[][] = [
    ['#', 'Suíte', 'Descrição', 'Qtd. de cenários', 'Cenários'],
    ...payload.suites.map((suite: StoreSuiteExportPayload['suites'][number], index: number) => [
      `${index + 1}`,
      suite.name || '—',
      suite.description || '—',
      `${suite.scenarios.length}`,
      suite.scenarios
        .map(
          (
            scenario: StoreSuiteExportPayload['suites'][number]['scenarios'][number],
            scenarioIndex: number,
          ) => `${scenarioIndex + 1}. ${scenario.title || '—'}`,
        )
        .join('\n'),
    ]),
  ];

  return [
    { name: 'Resumo', rows: summaryRows },
    { name: 'Suítes', rows: suiteRows },
  ];
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
  const scenarioLines = payload.scenarios.map((scenario: StoreScenario, index: number) =>
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
  const suiteLines = payload.suites.map(
    (suite: StoreSuiteExportPayload['suites'][number], index: number) => {
      const scenarioList = suite.scenarios
        .map(
          (
            scenario: StoreSuiteExportPayload['suites'][number]['scenarios'][number],
            scenarioIndex: number,
          ) => `  ${scenarioIndex + 1}. ${scenario.title || '—'}`,
        )
        .join('\n');

      return [
        `### ${index + 1}. ${suite.name}`,
        suite.description ? `- Descrição: ${suite.description}` : '- Descrição: —',
        '- Cenários:',
        scenarioList || '  —',
      ].join('\n');
    },
  );

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

export const downloadScenarioWorkbook = (payload: StoreExportPayload, fileName: string) => {
  const workbookBlob = createWorkbookBlob(
    buildScenarioSheets(payload),
    new Date(payload.exportedAt).toISOString(),
  );
  downloadBlobFile(workbookBlob, fileName);
};

export const downloadSuiteWorkbook = (payload: StoreSuiteExportPayload, fileName: string) => {
  const workbookBlob = createWorkbookBlob(
    buildSuiteSheets(payload),
    new Date(payload.exportedAt).toISOString(),
  );
  downloadBlobFile(workbookBlob, fileName);
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

  payload.scenarios.forEach((scenario: StoreScenario) => {
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

  payload.suites.forEach((suite: StoreSuiteExportPayload['suites'][number]) => {
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
