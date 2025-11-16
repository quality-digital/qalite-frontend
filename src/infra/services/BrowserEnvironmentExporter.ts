import type { Environment } from '../../domain/entities/Environment';
import type { EnvironmentExporter } from '../../application/ports/EnvironmentExporter';

export class BrowserEnvironmentExporter implements EnvironmentExporter {
  exportAsPDF(environment: Environment): void {
    if (typeof window === 'undefined') {
      return;
    }

    const scenarioRows = Object.values(environment.scenarios ?? {})
      .map(
        (scenario) => `
        <tr>
          <td>${scenario.titulo}</td>
          <td>${scenario.categoria}</td>
          <td>${scenario.criticidade}</td>
          <td>${scenario.status}</td>
          <td>${
            scenario.evidenciaArquivoUrl
              ? `<a href="${scenario.evidenciaArquivoUrl}">Arquivo</a>`
              : 'Sem evidência'
          }</td>
        </tr>
      `,
      )
      .join('');

    const documentContent = `
    <html>
      <head>
        <title>Ambiente ${environment.identificador}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Ambiente ${environment.identificador}</h1>
        <p>Status: ${environment.status}</p>
        <p>Tipo: ${environment.tipoAmbiente} · ${environment.tipoTeste}</p>
        <p>Jira: ${environment.jiraTask || 'Não informado'}</p>
        <h2>Cenários</h2>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Criticidade</th>
              <th>Status</th>
              <th>Evidência</th>
            </tr>
          </thead>
          <tbody>${scenarioRows}</tbody>
        </table>
      </body>
    </html>
  `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Não foi possível abrir a janela para impressão.');
    }

    printWindow.document.write(documentContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  exportAsMarkdown(environment: Environment): void {
    if (typeof document === 'undefined') {
      return;
    }

    const scenarioLines = Object.entries(environment.scenarios ?? {})
      .map(
        ([id, scenario]) =>
          `- **${scenario.titulo}** (${scenario.categoria} | ${scenario.criticidade}) - ${
            scenario.status
          }${scenario.evidenciaArquivoUrl ? ` [evidência](${scenario.evidenciaArquivoUrl})` : ''} (ID: ${id})`,
      )
      .join('\n');

    const markdown = `# Ambiente ${environment.identificador}

- Status: ${environment.status}
- Tipo: ${environment.tipoAmbiente} · ${environment.tipoTeste}
- Jira: ${environment.jiraTask || 'Não informado'}
- URLs:\n${environment.urls.map((url) => `  - ${url}`).join('\n') || '  - Nenhuma URL cadastrada'}

## Cenários
${scenarioLines || '- Nenhum cenário cadastrado'}

## Participantes
${environment.participants.map((id) => `- ${id}`).join('\n') || '- Nenhum participante registrado'}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ambiente-${environment.identificador}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
