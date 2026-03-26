# QaLite Frontend

Frontend do QaLite para gestão de qualidade de lojas e ambientes de teste.

Projeto construído com **React + Vite + TypeScript** e integrado ao **Firebase** (Authentication, Firestore e Storage).

## Stack principal

- React 18
- TypeScript 5
- Vite 5
- Firebase 10
- React Router 6
- i18next

## Pré-requisitos

- Node.js 18+
- npm 9+

## Instalação

```bash
npm install
npm run prepare
```

## Configuração de ambiente

Crie um arquivo `.env` com base em `.env.example`.

```bash
cp .env.example .env
```

Preencha as variáveis:

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

> `VITE_QALITE_SERVICE_URL` é a URL do serviço auxiliar utilizado nas integrações (ex.: Slack).

## Scripts disponíveis

- `npm run dev` — inicia ambiente de desenvolvimento
- `npm run build` — gera build de produção
- `npm run preview` — serve a build localmente
- `npm run typecheck` — valida tipos TypeScript
- `npm run lint` — executa ESLint
- `npm run lint:fix` — corrige problemas simples de lint
- `npm run format` — formata arquivos com Prettier

## Executando localmente

```bash
npm run dev
```

Acesse: `http://localhost:5173`

## Estrutura do projeto

```text
src/
├─ domain/            # Entidades e contratos
├─ infrastructure/    # Firebase, integrações externas e cache
├─ presentation/      # UI (páginas, componentes, rotas, hooks, providers)
├─ shared/            # Utilitários e configurações compartilhadas
├─ lib/               # Setup de bibliotecas (ex.: i18n)
└─ main.tsx           # Bootstrap da aplicação
```

## Qualidade e validação

Antes de abrir PR, execute:

```bash
npm run lint
npm run typecheck
npm run build
```

## Troubleshooting rápido

- **Erro de inicialização do Firebase**: revise variáveis `VITE_FIREBASE_*`.
- **Falha em integrações externas**: valide `VITE_QALITE_SERVICE_URL`.
- **Aviso de chunks grandes no build**: é apenas warning do bundler (não bloqueia o build).
