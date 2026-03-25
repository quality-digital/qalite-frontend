import type { Organization } from '../../domain/entities/organization';
import type { StoreExportPayload } from '../../domain/entities/store';
import { formatDateTime } from './time';
import i18n from '../../lib/i18n';
import { normalizeAutomationEnum, normalizeCriticalityEnum } from './scenarioEnums';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const URL_PATTERN = /\b((https?:\/\/|www\.)[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;

const buildHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const linkifyHtml = (value: string) => {
  if (!value) {
    return '';
  }

  let result = '';
  let lastIndex = 0;
  const regex = new RegExp(URL_PATTERN);

  value.replace(regex, (match, _value, _protocol, offset: number) => {
    if (offset > lastIndex) {
      result += escapeHtml(value.slice(lastIndex, offset));
    }

    const href = buildHref(match);
    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(match)}</a>`;
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < value.length) {
    result += escapeHtml(value.slice(lastIndex));
  }

  return result || escapeHtml(value);
};

const formatAutomationLabel = (value: string | null | undefined, t: (key: string) => string) => {
  const normalized = normalizeAutomationEnum(value);
  if (normalized === 'AUTOMATED') {
    return t('scenarioOptions.automated');
  }
  if (normalized === 'NOT_AUTOMATED') {
    return t('scenarioOptions.notAutomated');
  }
  return value?.trim() || t('storeSummary.emptyValue');
};

const formatCriticalityLabel = (value: string | null | undefined, t: (key: string) => string) => {
  const normalized = normalizeCriticalityEnum(value);
  if (normalized === 'LOW') {
    return t('scenarioOptions.low');
  }
  if (normalized === 'MEDIUM') {
    return t('scenarioOptions.medium');
  }
  if (normalized === 'HIGH') {
    return t('scenarioOptions.high');
  }
  if (normalized === 'CRITICAL') {
    return t('scenarioOptions.critical');
  }
  return value?.trim() || t('storeSummary.emptyValue');
};

const getCriticalityClassName = (value: string | null | undefined) => {
  const normalized = normalizeCriticalityEnum(value);
  if (normalized === 'LOW') {
    return 'criticality-pill criticality-pill--low';
  }
  if (normalized === 'MEDIUM') {
    return 'criticality-pill criticality-pill--medium';
  }
  if (normalized === 'HIGH') {
    return 'criticality-pill criticality-pill--high';
  }
  if (normalized === 'CRITICAL') {
    return 'criticality-pill criticality-pill--critical';
  }
  return 'criticality-pill criticality-pill--unknown';
};

const buildExternalLink = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return null;
};

export const openScenarioPdf = (
  payload: StoreExportPayload,
  title: string,
  targetWindow?: Window | null,
  organization?: Pick<Organization, 'name' | 'logoUrl'> | null,
) => {
  const t = i18n.t.bind(i18n);
  const printableWindow = targetWindow ?? window.open('', '_blank');

  if (!printableWindow) {
    throw new Error(t('storeSummary.pdfOpenError'));
  }

  const scenarioRows = payload.scenarios
    .map((scenario, index) => {
      const observation = scenario.observation?.trim() || t('storeSummary.emptyValue');
      const bdd = scenario.bdd?.trim() || t('storeSummary.emptyValue');
      const automation = formatAutomationLabel(scenario.automation, t);
      const criticality = formatCriticalityLabel(scenario.criticality, t);
      const criticalityClass = getCriticalityClassName(scenario.criticality);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${linkifyHtml(scenario.title || t('storeSummary.emptyValue'))}</td>
          <td>${linkifyHtml(scenario.category || t('storeSummary.emptyValue'))}</td>
          <td>${escapeHtml(automation)}</td>
          <td><span class="${criticalityClass}">${escapeHtml(criticality)}</span></td>
          <td>${linkifyHtml(observation)}</td>
          <td>${linkifyHtml(bdd)}</td>
        </tr>
      `;
    })
    .join('');

  const siteHref = buildExternalLink(payload.store.site);
  const siteLabel = payload.store.site?.trim() || t('storeSummary.notProvided');
  const siteValue = siteHref
    ? `<a href="${escapeHtml(siteHref)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
        siteLabel,
      )}</a>`
    : escapeHtml(siteLabel);
  const organizationName = organization?.name?.trim() || '';
  const organizationLogo = organization?.logoUrl?.trim() || '';
  const storeName = payload.store.name?.trim() || t('storeSummary.emptyValue');
  const storeLogo = payload.store.logoUrl?.trim() || organizationLogo;
  const brandingItems = [
    {
      key: 'organization',
      label: t('storeSummary.organizationLabel'),
      name: organizationName,
      logo: organizationLogo,
      fallbackAlt: t('storeSummary.organizationLogoAlt'),
    },
    {
      key: 'store',
      label: t('storeSummary.store'),
      name: storeName,
      logo: storeLogo,
      fallbackAlt: t('storeSummary.storeLogoAlt'),
    },
  ].filter((item) => item.name || item.logo);

  const brandingHeader = brandingItems.length
    ? `<div class="org-header">${brandingItems
        .map(
          (item) => `<div class="org-header-item">
            ${item.logo ? `<img src="${escapeHtml(item.logo)}" alt="${escapeHtml(item.name || item.fallbackAlt)}" class="org-logo" />` : ''}
            <div class="org-header-copy">
              <span class="org-label">${escapeHtml(item.label)}</span>
              ${item.name ? `<span class="org-name">${escapeHtml(item.name)}</span>` : ''}
            </div>
          </div>`,
        )
        .join('')}</div>`
    : '';

  const content = `
    <!doctype html>
    <html lang="${escapeHtml(i18n.language || 'pt-BR')}">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root {
            --color-surface-muted: #f5f7fb;
            --color-border: #e5e7eb;
            --color-text-muted: #6b7280;
            --table-border: #d1d5db;
            --table-header-bg: #f9fafb;
            --criticality-low-bg: #22c55e;
            --criticality-low-text: #ffffff;
            --criticality-medium-bg: #f59e0b;
            --criticality-medium-text: #ffffff;
            --criticality-high-bg: #f97316;
            --criticality-high-text: #ffffff;
            --criticality-critical-bg: #8b5cf6;
            --criticality-critical-text: #ffffff;
            --criticality-unknown-bg: #bdc3c7;
            --criticality-unknown-text: #2c3e50;
          }
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; }
          h1 { margin-bottom: 4px; }
          .org-header { display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px; margin-bottom: 12px; }
          .org-header-item { display: flex; align-items: center; gap: 12px; min-width: 220px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-muted); }
          .org-header-copy { display: flex; flex-direction: column; gap: 2px; }
          .org-label { font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
          .org-logo { width: 48px; height: 48px; border-radius: 10px; object-fit: contain; border: 1px solid var(--color-border); background: #fff; }
          .org-name { font-size: 16px; font-weight: 600; color: #111827; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; padding: 12px; background: var(--color-surface-muted); border: 1px solid var(--color-border); border-radius: 12px; }
          .summary-grid span { color: var(--color-text-muted); font-size: 12px; }
          .summary-grid strong { display: block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid var(--table-border); padding: 8px; text-align: left; vertical-align: top; }
          th { background: var(--table-header-bg); }
          .criticality-pill { display: inline-flex; align-items: center; justify-content: center; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid var(--table-border); }
          .criticality-pill--low { background: var(--criticality-low-bg); color: var(--criticality-low-text); }
          .criticality-pill--medium { background: var(--criticality-medium-bg); color: var(--criticality-medium-text); }
          .criticality-pill--high { background: var(--criticality-high-bg); color: var(--criticality-high-text); }
          .criticality-pill--critical { background: var(--criticality-critical-bg); color: var(--criticality-critical-text); }
          .criticality-pill--unknown { background: var(--criticality-unknown-bg); color: var(--criticality-unknown-text); }
        </style>
      </head>
      <body>
        ${brandingHeader}
        <h1>${escapeHtml(title)}</h1>
        <div class="summary-grid">
          <div>
            <span>${escapeHtml(t('storeSummary.store'))}</span>
            <strong>${linkifyHtml(payload.store.name)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t('storeSummary.siteLabel'))}</span>
            <strong>${siteValue}</strong>
          </div>
          <div>
            <span>${escapeHtml(t('storeSummary.environmentLabel'))}</span>
            <strong>${escapeHtml(payload.store.stage || t('storeSummary.notInformed'))}</strong>
          </div>
          <div>
            <span>${escapeHtml(t('storeSummary.scenarioCountLabel'))}</span>
            <strong>${payload.scenarios.length}</strong>
          </div>
          <div>
            <span>${escapeHtml(t('storeSummary.exportedAtLabel'))}</span>
            <strong>${escapeHtml(
              formatDateTime(payload.exportedAt, {
                locale: i18n.language,
                emptyLabel: t('storeSummary.notInformed'),
              }),
            )}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t('storeSummary.title'))}</th>
              <th>${escapeHtml(t('storeSummary.category'))}</th>
              <th>${escapeHtml(t('storeSummary.automation'))}</th>
              <th>${escapeHtml(t('storeSummary.criticality'))}</th>
              <th>${escapeHtml(t('storeSummary.observation'))}</th>
              <th>${escapeHtml(t('storeSummary.bdd'))}</th>
            </tr>
          </thead>
          <tbody>
            ${
              scenarioRows ||
              `<tr><td colspan="7">${escapeHtml(t('storeSummary.noScenariosRegistered'))}</td></tr>`
            }
          </tbody>
        </table>
      </body>
    </html>
  `;

  printableWindow.document.open();
  printableWindow.document.write(content);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
};
