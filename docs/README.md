# QAlite Frontend — documentação técnica

## Visão geral

QAlite Frontend é uma aplicação web React/Vite para gestão de execução de QA por organizações. O código existente cobre autenticação, vínculo de usuários a organizações, administração de lojas/projetos, cadastro de cenários, suites e categorias, criação de ambientes de execução, atualização de status por cenário/plataforma, evidências, exportações e envio de resumos para Slack.

O projeto é exclusivamente frontend: não há servidor Node, middlewares backend ou models ORM no repositório. A persistência e autenticação reais são feitas no Firebase Auth, Firestore e Storage. Existe também uma variável para `VITE_QALITE_SERVICE_URL`, porém o código atual não a consome.

## Principais funcionalidades reais

- Autenticação por e-mail/senha, Google e GitHub, registro, recuperação e redefinição de senha.
- Perfis de usuário com preferências de tema/idioma, foto e credenciais BrowserStack armazenadas no perfil.
- Organizações com membros, domínio de e-mail, logo, webhook Slack, credenciais BrowserStack e solicitações de acesso.
- Lojas/projetos vinculados à organização, com site, estágio, colunas de ambiente, logo, webhook Slack e contadores de cenários.
- Cenários, suites e categorias como subcoleções de lojas.
- Ambientes de execução com suites/cenários copiados da loja, participantes, rastreamento de tempo, evidências, status e link público.
- Exportação de cenários/ambientes em Excel e impressão/exportação em PDF via janela do navegador.
- Resumo de execução enviado diretamente para webhook do Slack.
- Internacionalização em português e inglês.

## Arquitetura

A aplicação segue uma separação em camadas:

1. `src/main.tsx` inicializa React, CSS global e i18n.
2. `src/presentation/routes/AppRoutes.tsx` define rotas públicas, autenticadas e administrativas.
3. `src/presentation/providers/AppProviders.tsx` compõe contexts globais.
4. `src/presentation/pages` concentra telas e orquestra hooks/componentes.
5. `src/infrastructure/services` expõe serviços como aliases dos repositórios Firebase.
6. `src/infrastructure/repositories` implementa contratos de `src/domain/repositories` delegando para clientes externos.
7. `src/infrastructure/external` contém chamadas concretas a Firebase, Storage, Slack e exportadores.
8. `src/domain/entities` define os formatos de domínio usados pelas telas e repositórios.

Consulte detalhes em [architecture.md](./architecture.md), [frontend.md](./frontend.md), [database.md](./database.md) e [integrations.md](./integrations.md).

## Tecnologias utilizadas

- React 18 com TypeScript.
- Vite para desenvolvimento, build e preview.
- React Router para roteamento.
- Firebase Auth, Firestore e Storage.
- i18next/react-i18next para i18n.
- ExcelJS e file-saver para planilhas Excel.
- React Icons para ícones.
- ESLint e Prettier para qualidade/formatação.
- Husky, commitlint e lint-staged para hooks de Git.

## Estrutura de pastas

| Pasta/arquivo                             | Uso real                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/main.tsx`                            | Ponto de entrada da SPA.                                                                    |
| `src/domain/entities`                     | Types/interfaces de autenticação, organização, loja, ambiente, Slack e usuário.             |
| `src/domain/repositories`                 | Contratos dos repositórios usados pela camada de serviço.                                   |
| `src/infrastructure/database/firebase.ts` | Inicialização Firebase Auth, Firestore com cache persistente e Storage.                     |
| `src/infrastructure/external`             | Operações Firebase/Storage/Slack e formatação/exportação.                                   |
| `src/infrastructure/repositories`         | Adapters que satisfazem contratos de domínio.                                               |
| `src/infrastructure/services`             | Fachadas consumidas pela apresentação.                                                      |
| `src/presentation/components`             | Componentes de UI reutilizáveis e componentes de ambiente.                                  |
| `src/presentation/context`                | Contexts de auth, tema, toast, preferências, branding, lojas realtime e notificações admin. |
| `src/presentation/hooks`                  | Hooks para auth, realtime, detalhes de ambiente, perfis, stores e tracking.                 |
| `src/presentation/pages`                  | Páginas roteadas da aplicação.                                                              |
| `src/presentation/routes`                 | BrowserRouter, lazy loading e guards.                                                       |
| `src/shared`                              | Configurações, erros e utilitários compartilhados.                                          |
| `src/utils/exportExcel.ts`                | Exportação Excel com ExcelJS.                                                               |
| `public/assets/logo.png`                  | Logo servido publicamente para favicon/fallback.                                            |
| `docs`                                    | Documentação e diagramas gerados após a limpeza.                                            |

## Fluxos do sistema

### Fluxo principal

1. O usuário acessa `/` e é direcionado conforme autenticação/organização.
2. Usuários autenticados acessam `/dashboard`, `/stores`, `/environments` e `/profile`.
3. Administradores acessam `/admin` e `/admin/organizations`.
4. A loja selecionada fornece cenários, suites, categorias e colunas para criação de ambientes.
5. O ambiente armazena cenários, participantes, status por plataforma e evidências.
6. O usuário pode exportar relatórios ou enviar resumo para Slack.

### Fluxo de autenticação

- `AuthProvider` assina mudanças de sessão Firebase.
- `ProtectedRoute` bloqueia rotas sem usuário.
- `RoleProtectedRoute` restringe rotas a roles permitidas.
- Login social cria/atualiza documento em `users` e tenta associação automática por domínio de e-mail quando possível.

### Fluxo de dados

- Páginas chamam hooks/contextos.
- Hooks/contextos usam `authService`, `storeService`, `environmentService`, `organizationService` e `userService`.
- Serviços apontam para repositórios Firebase.
- Repositórios chamam módulos `external`, que executam queries/mutations em Firestore/Auth/Storage.
- Dados retornam como entities de domínio.

### Fluxo de integrações

- Firebase Auth: sessão e provedores de login.
- Firestore: coleções `users`, `organizations`, `stores`, `environments` e subcoleções.
- Firebase Storage: upload de logos, fotos e evidências.
- Slack: POST direto para webhook configurado em organização/loja.
- BrowserStack: somente credenciais armazenadas em usuários/organizações; não há chamada para API BrowserStack no código atual.

## Como executar

```bash
npm install
cp .env.example .env
npm run dev
```

### Variáveis obrigatórias para Firebase

Preencha no `.env` os valores `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` e, se usado pelo projeto Firebase, `VITE_FIREBASE_MEASUREMENT_ID`.

### Scripts

- `npm run dev`: servidor Vite na porta 5173.
- `npm run build`: build de produção.
- `npm run preview`: preview na porta 4173.
- `npm run typecheck`: TypeScript sem emissão.
- `npm run lint`: ESLint nos arquivos `src/**/*.{ts,tsx}`.
- `npm run lint:fix`: correção automática de lint.
- `npm run format`: Prettier em TS/JS/JSON/CSS/MD.

## Dependências principais

- `firebase`: autenticação, Firestore, Storage e cache local persistente.
- `react`, `react-dom`: UI.
- `react-router-dom`: rotas e redirects.
- `i18next`, `react-i18next`: traduções.
- `exceljs`, `file-saver`: geração e download de Excel.
- `react-icons`: ícones Feather/GitHub usados pela UI.

## Integrações

Veja [integrations.md](./integrations.md) para endpoints/serviços externos reais, incluindo Firebase, Storage, Slack e BrowserStack como armazenamento de credenciais.

## Regras de negócio resumidas

- Roles reais: `admin` e `user`.
- Usuário sem organização pode solicitar acesso ou ser vinculado por domínio de e-mail.
- Ambientes possuem status `backlog`, `in_progress` e `done`.
- Cenários de ambiente possuem status `pendente`, `em_andamento`, `bloqueado`, `concluido`, `concluido_automatizado` e `nao_se_aplica`.
- Lojas mantêm contadores de cenários automatizados/não automatizados em transações.
- Categorias não podem ser excluídas se houver cenário usando o nome da categoria.

## Índice da documentação

- [Arquitetura](./architecture.md)
- [Frontend](./frontend.md)
- [Backend](./backend.md)
- [Banco de dados](./database.md)
- [Integrações](./integrations.md)
- [Autenticação](./authentication.md)
- [Variáveis de ambiente](./environment-variables.md)
- [Regras de negócio](./business-rules.md)
- [Referência de API interna](./api-reference.md)
- [Dívida técnica](./technical-debt.md)
- [Diagramas PlantUML](./diagrams/)
