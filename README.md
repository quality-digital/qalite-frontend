# QaLite Auth Starter

Base de autenticação escalável construída com **React + Vite** e **Firebase Authentication** seguindo princípios de clean architecture e preparada para expansão de módulos.

## 🚀 Stack principal

- React 18 com Vite + TypeScript
- Firebase Authentication e Firestore para perfis/roles
- React Router DOM para roteamento
- ESLint + Prettier para qualidade de código
- Husky + lint-staged + Commitlint para automação de commits
- GitHub Actions para CI (build + lint)

## 📁 Estrutura de pastas

```
src/
 ├─ domain/
 │   ├─ entities/        # Entidades e tipos de domínio (User, Role, AuthUser)
 │   └─ repositories/    # Contratos dos repositórios (IAuthRepository, IStoreRepository...)
 ├─ application/
 │   ├─ errors/          # Classes de erro reutilizáveis
 │   ├─ ports/           # Portas/adapters (ex.: exportadores)
 │   └─ services/        # Serviços orquestradores que falam diretamente com os repositórios
 ├─ infra/
 │   ├─ firebase/        # Configuração do Firebase
 │   ├─ repositories/    # Implementações concretas (FirebaseAuthRepository)
 │   └─ services/        # Adapters específicos de infraestrutura (ex.: exportadores)
 ├─ presentation/
 │   ├─ components/      # Componentes de UI reutilizáveis
 │   ├─ context/         # Contextos React (AuthProvider, ToastProvider...)
 │   ├─ hooks/           # Hooks reutilizáveis (useAuth, useToast)
 │   ├─ pages/           # Páginas da aplicação (Login, Register, Dashboards)
 │   ├─ routes/          # Definição das rotas da aplicação (AppRoutes)
 │   ├─ styles/          # Estilos globais
 │   └─ utils/           # Funções de apoio da camada de UI
 └─ main/
     └─ factories/       # Factories que montam serviços (ex.: authService)
```

O domínio permanece independente de detalhes externos, descrevendo apenas os tipos e contratos. Os serviços da camada `application` agora se conectam diretamente aos repositórios concretos providos pela `infra`, reduzindo indiretamente o número de camadas sem abrir mão das abstrações necessárias.

## 🔐 Funcionalidades de autenticação

- Cadastro com validação de nome, e-mail, senha e confirmação, gravando perfil/role no Firestore.
- Login com persistência de sessão do Firebase e mensagens de erro tratadas.
- Recuperação de senha com envio de e-mail.
- Logout com limpeza de estado e contexto.
- Rotas protegidas por autenticação e por role (`admin` e `user`) com redirecionamentos apropriados.

## ⚙️ Configuração do Firebase

Crie um arquivo `.env` baseado no `.env.example` com suas credenciais do Firebase:

```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
```

As variáveis são lidas via `import.meta.env` em `src/infra/firebase/firebaseConfig.ts` e **nenhuma chave fica hardcoded** no código.

## 🧠 Como estender

- **Adicionar um novo papel (role):**
  1. Inclua o novo valor em `AVAILABLE_ROLES` (`src/domain/entities/Role.ts`).
  2. Atualize interfaces/guards (`RoleProtectedRoute`) com a nova role quando necessário.
  3. Ajuste formulários ou lógica de atribuição no cadastro, se aplicável.
- **Criar nova rota protegida:**
  1. Crie a página em `src/presentation/pages`.
  2. No arquivo de rotas (`src/presentation/routes/AppRoutes.tsx`), envolva a rota com `<ProtectedRoute>` ou `<RoleProtectedRoute allowedRoles={[...]}>` conforme o nível de permissão desejado.
- **Suportar outro provider de autenticação:**
  1. Implemente uma classe que siga `IAuthRepository` em `src/infra/repositories`.
  2. Substitua a instância usada em `AuthService` pelo novo repositório (ou injete via factory/DI).
  3. Os serviços e camadas superiores permanecem inalterados.

## 🧩 Scripts disponíveis

```
npm run dev          # Ambiente de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run typecheck    # Checagem de tipos
npm run lint         # ESLint
npm run lint:fix     # ESLint com correção
npm run format       # Prettier write
npm run prepare      # Instala hooks do Husky
```

## ✅ Ferramentas de qualidade

- `.eslintrc.cjs` configurado para React, Hooks e TypeScript.
- `.prettierrc` com estilo consistente.
- `lint-staged` para rodar ESLint + Prettier nos arquivos alterados.
- Husky com hooks `pre-commit` e `commit-msg` para garantir lint e Conventional Commits.
- `commitlint.config.cjs` estendendo `@commitlint/config-conventional`.

## 🛠️ Workflow de CI

Arquivo `.github/workflows/ci.yml` executa:

1. Instalação das dependências (cache de npm).
2. Lint (`npm run lint`).
3. Build (`npm run build`).

A estrutura já está pronta para adicionar testes automatizados futuramente.

## ▶️ Uso rápido

```bash
npm install
npm run prepare # instala os hooks do Husky
npm run dev
```

Abra `http://localhost:5173` e teste os fluxos de autenticação. Roles de exemplo: `admin` e `user`.

## 📄 Licença

Distribuído sob a licença MIT. Ajuste conforme necessário.
