import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type EnvironmentExportRow = {
  titulo: string;
  categoria: string;
  criticidade: string;
  observacao?: string;
  statuses: string[];
  evidencia?: string;
};

export type EnvironmentBugExportRow = {
  cenario: string;
  severidade: string;
  prioridade: string;
  resultadoAtual: string;
};

export type ScenarioExportRow = {
  titulo: string;
  categoria: string;
  automacao: string;
  criticidade: string;
  observacao?: string;
  bdd?: string;
};

export type ExportInfoRow = {
  label: string;
  value: string;
};

const COLORS = {
  headerBg: '1F3A5F',
  headerText: 'FFFFFF',
  border: '2B3B55',

  grayBg: 'BDC3C7',
  grayText: '2C3E50',

  pendingBg: 'F59E0B',
  pendingText: 'FFFFFF',
  inProgressBg: '3B82F6',
  inProgressText: 'FFFFFF',
  doneBg: '22C55E',
  doneText: 'FFFFFF',
  blockedBg: 'EF4444',
  blockedText: 'FFFFFF',
  notApplicableBg: '94A3B8',
  notApplicableText: 'FFFFFF',

  severityLowBg: '22C55E',
  severityLowText: 'FFFFFF',
  severityMediumBg: 'F59E0B',
  severityMediumText: 'FFFFFF',
  severityHighBg: 'F97316',
  severityHighText: 'FFFFFF',
  severityCriticalBg: '8B5CF6',
  severityCriticalText: 'FFFFFF',

  criticalityLowBg: '22C55E',
  criticalityLowText: 'FFFFFF',
  criticalityMediumBg: 'F59E0B',
  criticalityMediumText: 'FFFFFF',
  criticalityHighBg: 'F97316',
  criticalityHighText: 'FFFFFF',
  criticalityCriticalBg: '8B5CF6',
  criticalityCriticalText: 'FFFFFF',
};

const normalize = (value: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

const applyBorder = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
};

const applyHeaderStyle = (cell: ExcelJS.Cell) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  cell.font = { bold: true, color: { argb: COLORS.headerText } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  applyBorder(cell);
};

const applyBaseCellStyle = (cell: ExcelJS.Cell) => {
  cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  applyBorder(cell);
};

const stylePill = (cell: ExcelJS.Cell, bg: string, fg: string) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { bold: true, color: { argb: fg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  applyBorder(cell);
};

const statusStyle = (status: string) => {
  const normalized = normalize(status);
  if (normalized.includes('nao') && normalized.includes('aplica')) {
    return { bg: COLORS.notApplicableBg, fg: COLORS.notApplicableText };
  }
  if (
    normalized.includes('conclu') ||
    normalized.includes('complete') ||
    normalized.includes('resolvid')
  ) {
    return { bg: COLORS.doneBg, fg: COLORS.doneText };
  }
  if (normalized.includes('andamento') || normalized.includes('progress')) {
    return { bg: COLORS.inProgressBg, fg: COLORS.inProgressText };
  }
  if (normalized.includes('pend') || normalized.includes('abert')) {
    return { bg: COLORS.pendingBg, fg: COLORS.pendingText };
  }
  if (
    normalized.includes('bloq') ||
    normalized.includes('erro') ||
    normalized.includes('block') ||
    normalized.includes('fail')
  ) {
    return { bg: COLORS.blockedBg, fg: COLORS.blockedText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const criticidadeStyle = (criticality: string) => {
  const normalized = normalize(criticality);
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return { bg: COLORS.criticalityLowBg, fg: COLORS.criticalityLowText };
  }
  if (
    normalized.includes('média') ||
    normalized.includes('media') ||
    normalized.includes('medium')
  ) {
    return { bg: COLORS.criticalityMediumBg, fg: COLORS.criticalityMediumText };
  }
  if (normalized.includes('crit') || normalized.includes('critical')) {
    return { bg: COLORS.criticalityCriticalBg, fg: COLORS.criticalityCriticalText };
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return { bg: COLORS.criticalityHighBg, fg: COLORS.criticalityHighText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const severityStyle = (severity: string) => {
  const normalized = normalize(severity);
  if (normalized.includes('crit') || normalized.includes('critical')) {
    return { bg: COLORS.severityCriticalBg, fg: COLORS.severityCriticalText };
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return { bg: COLORS.severityHighBg, fg: COLORS.severityHighText };
  }
  if (
    normalized.includes('média') ||
    normalized.includes('media') ||
    normalized.includes('medium')
  ) {
    return { bg: COLORS.severityMediumBg, fg: COLORS.severityMediumText };
  }
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return { bg: COLORS.severityLowBg, fg: COLORS.severityLowText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const priorityStyle = (priority: string) => {
  const normalized = normalize(priority);
  if (
    normalized.includes('urgente') ||
    normalized.includes('crit') ||
    normalized.includes('critical')
  ) {
    return { bg: COLORS.severityCriticalBg, fg: COLORS.severityCriticalText };
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return { bg: COLORS.severityHighBg, fg: COLORS.severityHighText };
  }
  if (
    normalized.includes('média') ||
    normalized.includes('media') ||
    normalized.includes('medium')
  ) {
    return { bg: COLORS.severityMediumBg, fg: COLORS.severityMediumText };
  }
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return { bg: COLORS.severityLowBg, fg: COLORS.severityLowText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const calcColWidth = (values: Array<string | undefined>, min = 12, max = 70) => {
  const longest = values.reduce((maxValue, value) => {
    return Math.max(maxValue, String(value ?? '').length);
  }, 0);
  return Math.min(max, Math.max(min, Math.ceil(longest * 1.1)));
};

const calcRowHeightByWrap = (
  rowValues: Array<string | undefined>,
  colWidths: number[],
  base = 18,
) => {
  let maxLines = 1;
  rowValues.forEach((value, index) => {
    const text = String(value ?? '');
    const charsPerLine = Math.max(10, Math.floor(colWidths[index] * 1.0));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    maxLines = Math.max(maxLines, lines);
  });
  return Math.max(base, maxLines * 16);
};

const applyColumnWidths = (
  worksheet: ExcelJS.Worksheet,
  columnsValues: Array<Array<string | undefined>>,
) => {
  const columnWidths = columnsValues.map((values) => calcColWidth(values));
  worksheet.columns.forEach((column, index) => {
    column.width = columnWidths[index] ?? 12;
  });
  return columnWidths;
};

const applyAutoRowHeights = (
  worksheet: ExcelJS.Worksheet,
  columnWidths: number[],
  startRow = 2,
) => {
  for (let rowIndex = startRow; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const rowValues = worksheet.columns.map((column, index) =>
      String(row.getCell(column.number ?? index + 1).value ?? ''),
    );
    row.height = calcRowHeightByWrap(rowValues, columnWidths);
  }
};

const buildInfoSheet = (
  workbook: ExcelJS.Workbook,
  sheetName: string,
  headerLabels: [string, string],
  rows: ExportInfoRow[],
) => {
  const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  worksheet.columns = [
    { header: headerLabels[0], key: 'label' },
    { header: headerLabels[1], key: 'value' },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  rows.forEach((row) => worksheet.addRow(row));

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell) => applyBaseCellStyle(cell));
  }

  const columnValues = [
    [headerLabels[0], ...rows.map((row) => row.label)],
    [headerLabels[1], ...rows.map((row) => row.value)],
  ];
  const columnWidths = applyColumnWidths(worksheet, columnValues);
  applyAutoRowHeights(worksheet, columnWidths);
};

export const exportEnvironmentExcel = async ({
  fileName,
  scenarioSheetName,
  environmentSheetName,
  bugSheetName,
  infoHeaderLabels,
  infoRows,
  scenarioRows,
  scenarioHeaderLabels,
  bugRows,
  bugHeaderLabels,
}: {
  fileName: string;
  scenarioSheetName: string;
  environmentSheetName: string;
  bugSheetName: string;
  infoHeaderLabels: [string, string];
  infoRows: ExportInfoRow[];
  scenarioRows: EnvironmentExportRow[];
  scenarioHeaderLabels: string[];
  bugRows: EnvironmentBugExportRow[];
  bugHeaderLabels: [string, string, string, string];
}) => {
  const workbook = new ExcelJS.Workbook();
  const statusColumnCount = Math.max(0, scenarioRows[0]?.statuses.length ?? 0);
  const hasEvidenceColumn = scenarioHeaderLabels.length > 4 + statusColumnCount;

  buildInfoSheet(workbook, environmentSheetName, infoHeaderLabels, infoRows);

  const worksheet = workbook.addWorksheet(scenarioSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: scenarioHeaderLabels[0], key: 'titulo' },
    { header: scenarioHeaderLabels[1], key: 'categoria' },
    { header: scenarioHeaderLabels[2], key: 'criticidade' },
    { header: scenarioHeaderLabels[3], key: 'observacao' },
    ...scenarioHeaderLabels.slice(4, 4 + statusColumnCount).map((header, index) => ({
      header,
      key: `status_${index}`,
    })),
    ...(hasEvidenceColumn
      ? [{ header: scenarioHeaderLabels[scenarioHeaderLabels.length - 1], key: 'evidencia' }]
      : []),
  ];

  const headers = worksheet.getRow(1);
  headers.height = 22;
  headers.eachCell((cell) => applyHeaderStyle(cell));

  scenarioRows.forEach((row) =>
    worksheet.addRow({
      titulo: row.titulo,
      categoria: row.categoria,
      criticidade: row.criticidade,
      observacao: row.observacao ?? '',
      ...row.statuses.reduce<Record<string, string>>((acc, status, index) => {
        acc[`status_${index}`] = status;
        return acc;
      }, {}),
      ...(hasEvidenceColumn ? { evidencia: row.evidencia ?? '' } : {}),
    }),
  );

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell) => applyBaseCellStyle(cell));

    const criticalityCell = row.getCell(3);
    const criticality = criticidadeStyle(String(criticalityCell.value ?? ''));
    stylePill(criticalityCell, criticality.bg, criticality.fg);

    for (let columnIndex = 5; columnIndex < 5 + statusColumnCount; columnIndex += 1) {
      const statusCell = row.getCell(columnIndex);
      const status = statusStyle(String(statusCell.value ?? ''));
      stylePill(statusCell, status.bg, status.fg);
    }
  }

  const columnValues = [
    [worksheet.getColumn(1).header as string, ...scenarioRows.map((row) => row.titulo)],
    [worksheet.getColumn(2).header as string, ...scenarioRows.map((row) => row.categoria)],
    [worksheet.getColumn(3).header as string, ...scenarioRows.map((row) => row.criticidade)],
    [worksheet.getColumn(4).header as string, ...scenarioRows.map((row) => row.observacao ?? '')],
    ...scenarioHeaderLabels
      .slice(4, 4 + statusColumnCount)
      .map((_, index) => [
        worksheet.getColumn(5 + index).header as string,
        ...scenarioRows.map((row) => row.statuses[index] ?? ''),
      ]),
    ...(hasEvidenceColumn
      ? [
          [
            worksheet.getColumn(5 + statusColumnCount).header as string,
            ...scenarioRows.map((row) => row.evidencia ?? ''),
          ],
        ]
      : []),
  ];
  const columnWidths = applyColumnWidths(worksheet, columnValues);
  applyAutoRowHeights(worksheet, columnWidths);

  if (bugRows.length > 0) {
    const bugWorksheet = workbook.addWorksheet(bugSheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    bugWorksheet.columns = [
      { header: bugHeaderLabels[0], key: 'cenario' },
      { header: bugHeaderLabels[1], key: 'severidade' },
      { header: bugHeaderLabels[2], key: 'prioridade' },
      { header: bugHeaderLabels[3], key: 'resultadoAtual' },
    ];

    const bugHeaderRow = bugWorksheet.getRow(1);
    bugHeaderRow.height = 22;
    bugHeaderRow.eachCell((cell) => applyHeaderStyle(cell));

    bugRows.forEach((row) => bugWorksheet.addRow(row));

    for (let rowIndex = 2; rowIndex <= bugWorksheet.rowCount; rowIndex += 1) {
      const row = bugWorksheet.getRow(rowIndex);
      row.eachCell((cell) => applyBaseCellStyle(cell));

      const severityCell = row.getCell(2);
      const severity = severityStyle(String(severityCell.value ?? ''));
      stylePill(severityCell, severity.bg, severity.fg);

      const priorityCell = row.getCell(3);
      const priority = priorityStyle(String(priorityCell.value ?? ''));
      stylePill(priorityCell, priority.bg, priority.fg);
    }

    const bugColumnValues = [
      [bugWorksheet.getColumn(1).header as string, ...bugRows.map((row) => row.cenario)],
      [bugWorksheet.getColumn(2).header as string, ...bugRows.map((row) => row.severidade)],
      [bugWorksheet.getColumn(3).header as string, ...bugRows.map((row) => row.prioridade)],
      [bugWorksheet.getColumn(4).header as string, ...bugRows.map((row) => row.resultadoAtual)],
    ];
    const bugColumnWidths = applyColumnWidths(bugWorksheet, bugColumnValues);
    applyAutoRowHeights(bugWorksheet, bugColumnWidths);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

export const exportScenarioExcel = async ({
  fileName,
  scenarioSheetName,
  infoSheetName,
  infoHeaderLabels,
  infoRows,
  scenarioRows,
  scenarioHeaderLabels,
}: {
  fileName: string;
  scenarioSheetName: string;
  infoSheetName: string;
  infoHeaderLabels: [string, string];
  infoRows: ExportInfoRow[];
  scenarioRows: ScenarioExportRow[];
  scenarioHeaderLabels: [string, string, string, string, string, string];
}) => {
  const workbook = new ExcelJS.Workbook();

  buildInfoSheet(workbook, infoSheetName, infoHeaderLabels, infoRows);

  const worksheet = workbook.addWorksheet(scenarioSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: scenarioHeaderLabels[0], key: 'titulo' },
    { header: scenarioHeaderLabels[1], key: 'categoria' },
    { header: scenarioHeaderLabels[2], key: 'automacao' },
    { header: scenarioHeaderLabels[3], key: 'criticidade' },
    { header: scenarioHeaderLabels[4], key: 'observacao' },
    { header: scenarioHeaderLabels[5], key: 'bdd' },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  scenarioRows.forEach((row) => worksheet.addRow(row));

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell) => applyBaseCellStyle(cell));

    const criticalityCell = row.getCell(4);
    const criticality = criticidadeStyle(String(criticalityCell.value ?? ''));
    stylePill(criticalityCell, criticality.bg, criticality.fg);
  }

  const columnValues = [
    [worksheet.getColumn(1).header as string, ...scenarioRows.map((row) => row.titulo)],
    [worksheet.getColumn(2).header as string, ...scenarioRows.map((row) => row.categoria)],
    [worksheet.getColumn(3).header as string, ...scenarioRows.map((row) => row.automacao)],
    [worksheet.getColumn(4).header as string, ...scenarioRows.map((row) => row.criticidade)],
    [worksheet.getColumn(5).header as string, ...scenarioRows.map((row) => row.observacao ?? '')],
    [worksheet.getColumn(6).header as string, ...scenarioRows.map((row) => row.bdd ?? '')],
  ];
  const columnWidths = applyColumnWidths(worksheet, columnValues);
  applyAutoRowHeights(worksheet, columnWidths);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};
