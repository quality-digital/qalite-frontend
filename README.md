# QaLite Frontend

Aplicação web do QaLite para gestão de ambientes, cenários e comunicação de status (incluindo Slack).

## Stack

- React 18 + TypeScript 5 + Vite 5
- Firebase (Auth, Firestore, Storage)
- i18next (pt/en)

## Requisitos

- Node.js 18+
- npm 9+

## Setup rápido

```bash
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`.

## Variáveis de ambiente

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_QALITE_SERVICE_URL=
```

`VITE_QALITE_SERVICE_URL` aponta para o serviço auxiliar (ex.: integração Slack).

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build produção
- `npm run preview` — preview local
- `npm run typecheck` — checagem de tipos
- `npm run lint` — lint
- `npm run lint:fix` — lint com correção automática
- `npm run format` — formatação

## Padrões adotados

- **i18n obrigatório** para textos de UI e mensagens estruturadas.
- **Toasts semânticos**: `success`, `alert`, `error`, `info`.
- **Cache centralizado** na camada `src/infrastructure/cache`.
- **UI/layout padronizados** com tokens de tema em `src/presentation/styles/global.css`.

## Estrutura

```text
src/
├─ domain/
├─ infrastructure/
├─ lib/
├─ locales/
├─ presentation/
└─ shared/
```

## Validação antes de PR

```bash
npm run lint
npm run typecheck
npm run build
```
