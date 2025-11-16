import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
  UpdateEnvironmentInput,
} from '../../domain/entities/Environment';
import { firebaseFirestore, firebaseStorage } from './firebaseConfig';

const ENVIRONMENTS_COLLECTION = 'environments';

const environmentsCollection = collection(firebaseFirestore, ENVIRONMENTS_COLLECTION);

const getString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const getStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

const parseTimestamp = (value: Timestamp | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === 'string' ? value : null;
};

const parseScenarioMap = (
  data: Record<string, unknown> | undefined,
): Record<string, EnvironmentScenario> => {
  if (!data) {
    return {};
  }

  return Object.entries(data).reduce<Record<string, EnvironmentScenario>>((acc, [id, value]) => {
    if (typeof value !== 'object' || value === null) {
      acc[id] = {
        titulo: '',
        categoria: '',
        criticidade: '',
        status: 'pendente',
        evidenciaArquivoUrl: null,
      };
      return acc;
    }

    const entry = value as Record<string, unknown>;
    acc[id] = {
      titulo: getString(entry.titulo),
      categoria: getString(entry.categoria),
      criticidade: getString(entry.criticidade),
      status: (entry.status ?? 'pendente') as EnvironmentScenarioStatus,
      evidenciaArquivoUrl: getStringOrNull(entry.evidenciaArquivoUrl),
    };
    return acc;
  }, {});
};

const normalizeEnvironment = (id: string, data: Record<string, unknown>): Environment => ({
  id,
  identificador: getString(data.identificador),
  storeId: getString(data.storeId ?? data.loja),
  urls: getStringArray(data.urls),
  jiraTask: getString(data.jiraTask),
  tipoAmbiente: getString(data.tipoAmbiente),
  tipoTeste: getString(data.tipoTeste),
  status: (data.status ?? 'backlog') as EnvironmentStatus,
  createdAt: parseTimestamp(data.createdAt as Timestamp | string | null | undefined) ?? null,
  updatedAt: parseTimestamp(data.updatedAt as Timestamp | string | null | undefined) ?? null,
  timeTracking: {
    start: parseTimestamp(
      (data.timeTracking as Record<string, unknown> | undefined)?.start as
        | Timestamp
        | string
        | null
        | undefined,
    ),
    end: parseTimestamp(
      (data.timeTracking as Record<string, unknown> | undefined)?.end as
        | Timestamp
        | string
        | null
        | undefined,
    ),
    totalMs: Number(
      typeof (data.timeTracking as Record<string, unknown> | undefined)?.totalMs === 'number'
        ? (data.timeTracking as Record<string, unknown>).totalMs
        : ((data.timeTracking as Record<string, unknown> | undefined)?.totalMs ?? 0),
    ),
  },
  presentUsersIds: getStringArray(data.presentUsersIds),
  concludedBy: getStringOrNull(data.concludedBy),
  scenarios: parseScenarioMap(data.scenarios as Record<string, unknown> | undefined),
  bugs: Number(data.bugs ?? 0),
  totalCenarios: Number(data.totalCenarios ?? 0),
  participants: getStringArray(data.participants),
});

export const createEnvironment = async (payload: CreateEnvironmentInput): Promise<Environment> => {
  const docRef = await addDoc(environmentsCollection, {
    ...payload,
    loja: payload.storeId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(docRef);
  return normalizeEnvironment(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
};

export const updateEnvironment = async (
  environmentId: string,
  payload: UpdateEnvironmentInput,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const data: Record<string, unknown> = {
    ...payload,
    updatedAt: serverTimestamp(),
  };

  if (payload.storeId) {
    data.loja = payload.storeId;
  }

  await updateDoc(environmentRef, data);
};

export const deleteEnvironment = async (environmentId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await deleteDoc(environmentRef);
};

export const getEnvironmentByIdRealtime = (
  environmentId: string,
  callback: (environment: Environment | null) => void,
) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  return onSnapshot(environmentRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(normalizeEnvironment(snapshot.id, snapshot.data() ?? {}));
  });
};

interface EnvironmentRealtimeFilters {
  storeId?: string;
}

export const getAllEnvironmentsRealtime = (
  filters: EnvironmentRealtimeFilters,
  callback: (environments: Environment[]) => void,
) => {
  const constraints: QueryConstraint[] = [];

  if (filters.storeId) {
    constraints.push(where('loja', '==', filters.storeId));
  }

  const environmentsQuery =
    constraints.length > 0 ? query(environmentsCollection, ...constraints) : environmentsCollection;

  return onSnapshot(environmentsQuery, (snapshot) => {
    const list = snapshot.docs
      .map((docSnapshot) => normalizeEnvironment(docSnapshot.id, docSnapshot.data() ?? {}))
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

    callback(list);
  });
};

const ACCEPTED_EVIDENCE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'application/zip',
  'application/x-zip-compressed',
];

const updateScenarioField = async (
  environmentId: string,
  scenarioId: string,
  updates: Record<string, unknown>,
) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await updateDoc(environmentRef, {
    ...Object.entries(updates).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[`scenarios.${scenarioId}.${key}`] = value;
      return acc;
    }, {}),
    updatedAt: serverTimestamp(),
  });
};

export const addUserToEnvironment = async (
  environmentId: string,
  userId: string,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      throw new Error('Ambiente não encontrado.');
    }

    const data = snapshot.data();
    if (data.status === 'done') {
      throw new Error('Ambiente já concluído.');
    }

    const presentUsers: string[] = data.presentUsersIds ?? [];
    const participants: string[] = data.participants ?? [];

    if (presentUsers.includes(userId)) {
      return;
    }

    transaction.update(environmentRef, {
      presentUsersIds: [...presentUsers, userId],
      participants: participants.includes(userId) ? participants : [...participants, userId],
      updatedAt: serverTimestamp(),
    });
  });
};

export const removeUserFromEnvironment = async (
  environmentId: string,
  userId: string,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      return;
    }

    const presentUsers: string[] = snapshot.data()?.presentUsersIds ?? [];
    transaction.update(environmentRef, {
      presentUsersIds: presentUsers.filter((id) => id !== userId),
      updatedAt: serverTimestamp(),
    });
  });
};

export const updateScenarioStatus = async (
  environmentId: string,
  scenarioId: string,
  status: EnvironmentScenarioStatus,
): Promise<void> => updateScenarioField(environmentId, scenarioId, { status });

export const uploadEvidenceFile = async (
  environmentId: string,
  scenarioId: string,
  file: File,
): Promise<string> => {
  if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
    throw new Error('Formato de arquivo não suportado.');
  }

  const path = `environments/${environmentId}/scenarios/${scenarioId}/${Date.now()}-${file.name}`;
  const storageRef = ref(firebaseStorage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateScenarioField(environmentId, scenarioId, { evidenciaArquivoUrl: url });
  return url;
};

export const exportEnvironmentAsPDF = (environment: Environment) => {
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
          <td>${scenario.evidenciaArquivoUrl ? `<a href="${scenario.evidenciaArquivoUrl}">Arquivo</a>` : 'Sem evidência'}</td>
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
};

export const exportEnvironmentAsMarkdown = (environment: Environment) => {
  if (typeof document === 'undefined') {
    return;
  }

  const scenarioLines = Object.entries(environment.scenarios ?? {})
    .map(
      ([id, scenario]) =>
        `- **${scenario.titulo}** (${scenario.categoria} | ${scenario.criticidade}) - ${scenario.status}${
          scenario.evidenciaArquivoUrl ? ` [evidência](${scenario.evidenciaArquivoUrl})` : ''
        } (ID: ${id})`,
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
};
