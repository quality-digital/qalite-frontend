# QALite Frontend

Interface web do QALite para gestão de lojas, organizações, ambientes de teste, cenários, evidências e usuários. O projeto é uma SPA em React e TypeScript, construída com Vite e integrada ao Firebase.

## Tecnologias principais

- React 18 e React Router;
- TypeScript em modo estrito;
- Vite para desenvolvimento e build;
- Firebase Authentication, Firestore e Storage;
- i18next para português e inglês;
- ESLint e Prettier para qualidade e padronização;
- Husky, lint-staged e commitlint para validações locais;
- ExcelJS e file-saver, carregados sob demanda, para exportações em Excel.

## Pré-requisitos

- Node.js 22 ou superior (a versão recomendada está em `.nvmrc`);
- npm 10 ou superior;
- um projeto Firebase com Authentication, Firestore e Storage configurados;
- acesso aos valores das variáveis de ambiente do projeto.

Se você usa `nvm`:

```bash
nvm use
```

## Configuração local

1. Instale as dependências exatamente como registradas no lockfile:

   ```bash
   npm ci
   ```

2. Crie o arquivo local de ambiente:

   ```bash
   cp .env.example .env.local
   ```

3. Preencha as variáveis em `.env.local`:

   | Variável                            | Finalidade                                                 |
   | ----------------------------------- | ---------------------------------------------------------- |
   | `VITE_FIREBASE_API_KEY`             | Chave pública do Firebase Web App.                         |
   | `VITE_FIREBASE_AUTH_DOMAIN`         | Domínio usado pelo Firebase Authentication.                |
   | `VITE_FIREBASE_PROJECT_ID`          | Identificador do projeto Firebase.                         |
   | `VITE_FIREBASE_STORAGE_BUCKET`      | Bucket do Firebase Storage.                                |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Identificador do remetente Firebase.                       |
   | `VITE_FIREBASE_APP_ID`              | Identificador do Firebase Web App.                         |
   | `VITE_FIREBASE_MEASUREMENT_ID`      | Identificador opcional do Google Analytics.                |
   | `VITE_QALITE_SERVICE_URL`           | URL base de serviços externos do QALite, quando aplicável. |

> Nunca envie `.env`, `.env.local`, credenciais, chaves privadas ou webhooks reais para o repositório. Variáveis prefixadas com `VITE_` são incorporadas ao bundle e não devem conter segredos de servidor.

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

O Vite exibirá no terminal o endereço local da aplicação.

## Scripts disponíveis

| Comando                | Descrição                                                     |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Inicia o Vite em modo de desenvolvimento.                     |
| `npm run build`        | Gera o bundle de produção em `dist/`.                         |
| `npm run preview`      | Serve localmente o conteúdo de `dist/` para validação.        |
| `npm run lint`         | Analisa arquivos TypeScript/TSX e falha com qualquer warning. |
| `npm run lint:fix`     | Aplica correções automáticas do ESLint.                       |
| `npm run typecheck`    | Executa o TypeScript sem gerar arquivos.                      |
| `npm run format`       | Formata o repositório com Prettier.                           |
| `npm run format:check` | Verifica formatação sem alterar arquivos.                     |
| `npm run check`        | Executa lint, typecheck e verificação de formatação.          |

Não há, atualmente, uma suíte automatizada de testes unitários ou de integração configurada. Mudanças em regras críticas devem incluir validação manual e, idealmente, introduzir testes automatizados em uma contribuição separada e bem delimitada.

## Estrutura do projeto

```text
public/                         # Assets servidos sem transformação
src/
├── domain/
│   ├── entities/              # Tipos e contratos do domínio
│   └── repositories/          # Interfaces de persistência e integrações
├── infrastructure/
│   ├── cache/                 # Cache local reutilizável
│   ├── database/              # Inicialização do Firebase
│   ├── external/              # Operações Firebase e integrações externas
│   ├── repositories/          # Implementações dos contratos do domínio
│   └── services/              # Pontos de acesso usados pela apresentação
├── lib/                       # Inicialização de bibliotecas globais
├── locales/                   # Catálogos de tradução pt/en
├── presentation/
│   ├── components/            # Componentes reutilizáveis
│   ├── constants/             # Opções exclusivas da interface
│   ├── context/               # Contextos React e estado compartilhado
│   ├── hooks/                 # Hooks de apresentação
│   ├── pages/                 # Páginas carregadas pelas rotas
│   ├── providers/             # Composição de providers
│   ├── routes/                # Rotas públicas e protegidas
│   ├── styles/                # Estilos globais
│   └── utils/                 # Utilitários exclusivos da interface
├── shared/                    # Configurações, erros e utilitários transversais
├── types/                     # Declarações TypeScript de terceiros
└── utils/                     # Utilitários de aplicação carregados sob demanda
```

### Fluxo entre camadas

1. Páginas, componentes e hooks consomem os módulos de `infrastructure/services`.
2. Os services expõem implementações de repositórios sem acoplar a apresentação aos detalhes de criação dessas implementações.
3. Os repositórios implementam os contratos definidos em `domain/repositories`.
4. Acesso direto a Firebase deve permanecer em `infrastructure/database`, `infrastructure/external` ou `infrastructure/repositories`.

Ao criar funcionalidades, preserve esse sentido de dependência: domínio não deve importar apresentação nem infraestrutura.

## Rotas e carregamento

As páginas são carregadas sob demanda em `src/presentation/routes/AppRoutes.tsx`. Rotas autenticadas usam `ProtectedRoute`; rotas administrativas também passam por `RoleProtectedRoute`. Providers públicos e autenticados são separados para evitar inicializar estado privado em páginas públicas.

Módulos pesados e usados apenas após uma ação, como exportação para Excel, também devem usar `import()` dinâmico para não aumentar o carregamento inicial das páginas.

## Internacionalização

- Todo texto visível deve usar chaves do i18next.
- Ao adicionar ou alterar uma chave, atualize `src/locales/pt.json` e `src/locales/en.json` no mesmo pull request.
- Evite duplicar traduções equivalentes; procure uma chave existente antes de criar outra.
- Mensagens que dependem de pluralização ou valores devem usar parâmetros do i18next.

## Estilos e componentes

- Reutilize componentes de `src/presentation/components` antes de criar variações locais.
- O projeto ainda usa um stylesheet global; prefira nomes de classe específicos e consistentes para evitar colisões.
- Remova a regra CSS junto com o componente ou estado visual que deixou de usá-la.
- Preserve os temas claro e escuro, responsividade e suporte a `prefers-reduced-motion`.
- Alterações visuais devem ser verificadas nos principais breakpoints e nos dois temas.

## Como contribuir

1. Atualize sua branch a partir da branch principal do projeto.
2. Crie uma branch curta e descritiva; commits diretos em `main`, `master` e `develop` são bloqueados pelos hooks locais.
3. Faça mudanças pequenas, coesas e sem refatorações não relacionadas.
4. Antes do commit, execute:

   ```bash
   npm run check
   npm run build
   ```

5. Faça também a validação manual do fluxo afetado com `npm run dev` ou `npm run preview`.
6. Use commits no padrão Conventional Commits, por exemplo:

   ```text
   feat: add environment filter
   fix: prevent duplicate store creation
   refactor: remove obsolete scenario styles
   docs: document local setup
   ```

7. Abra um pull request contendo:
   - contexto e objetivo;
   - resumo técnico;
   - passos de validação;
   - screenshots para alterações visuais;
   - riscos, migrações ou dependências de configuração.

### Hooks locais

Após `npm ci`, o script `prepare` instala os hooks do Husky:

- `pre-commit`: executa lint-staged e formata/verifica os arquivos preparados;
- `commit-msg`: valida Conventional Commits;
- `pre-push`: impede push direto de branches protegidas.

Os hooks ajudam no feedback rápido, mas não substituem `npm run check` e `npm run build` antes de abrir o pull request.

## Checklist de revisão

- [ ] A mudança preserva regras de negócio existentes, salvo quando o objetivo do PR diz o contrário.
- [ ] Estados de carregamento, vazio, erro e permissão foram considerados.
- [ ] Novos textos existem nos dois idiomas.
- [ ] Não foram adicionadas credenciais ou informações sensíveis.
- [ ] Não há imports, exports, classes CSS ou dependências sem uso.
- [ ] `npm run check` passa.
- [ ] `npm run build` passa.
- [ ] O fluxo alterado foi validado manualmente.
- [ ] Mudanças visuais possuem screenshots no PR.

## Build e deploy

```bash
npm run build
npm run preview
```

O build é gerado em `dist/`. O `vercel.json` mantém fallback para `index.html`, necessário para que URLs do React Router funcionem ao serem acessadas diretamente. Configure no provedor de deploy as mesmas variáveis `VITE_*` usadas no ambiente correspondente antes de gerar o bundle.

## Solução de problemas

### Firebase falha ao iniciar

Confira se todas as variáveis obrigatórias foram preenchidas, se o domínio local está autorizado no Firebase Authentication e se as regras do Firestore/Storage permitem o fluxo testado.

### Uma rota funciona por navegação, mas retorna 404 ao atualizar

O servidor precisa redirecionar rotas desconhecidas para `index.html`. Na Vercel, isso já está configurado em `vercel.json`; outros provedores precisam de regra equivalente.

### Hooks do Git não executam

Rode novamente:

```bash
npm run prepare
```

Confirme também que o Git está usando o diretório de hooks configurado pelo Husky.

### Build ou lint diverge entre máquinas

Use a versão de Node indicada em `.nvmrc`, apague instalações locais inconsistentes e reinstale pelo lockfile:

```bash
rm -rf node_modules
npm ci
npm run check
npm run build
```
