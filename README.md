# QaLite Auth Starter

Base de autenticação escalável construída com **React + Vite** e **Firebase Authentication** seguindo princípios de clean architecture e SOLID. O código foi simplificado para evitar camadas desnecessárias e manter a estrutura enxuta e legível.

## 🚀 Stack principal

- React 18 com Vite + TypeScript
- Firebase Authentication e Firestore
- React Router DOM para roteamento
- ESLint + Prettier para qualidade de código
- Husky + lint-staged + Commitlint para automação de commits
- GitHub Actions para CI (build + lint)

## 📁 Arquitetura em camadas

```
src/
 ├─ domain/            # Entidades e contratos de repositório (regra de negócio pura)
 ├─ application/       # Casos de uso que orquestram os repositórios
 ├─ infrastructure/    # Implementações concretas (Firebase, fetch etc.)
 ├─ presentation/      # Páginas, componentes, hooks, rotas e provedores React
 ├─ shared/            # Utilidades e configurações agnósticas de UI
 ├─ App.tsx            # Composição de rotas
 └─ main.tsx           # Bootstrap do React
```

A camada de aplicação agora usa diretamente os tipos do `domain`, removendo o antigo nível de DTOs que apenas replicava interfaces. Os repositórios continuam definidos por contratos na camada de domínio e implementados no diretório `infrastructure`, preservando inversão de dependência.

## 🔐 Funcionalidades

- Cadastro, login, logout e redefinição de senha com Firebase.
- Persistência de perfil (nome, avatar, role e organização) no Firestore.
- Proteção de rotas por autenticação e por role (`admin` e `user`).
- Dashboards, gerenciamento de organizações/lojas, ambientes e evidências.
- Exportação de ambientes em PDF ou Markdown e integração opcional com Slack.

## ⚙️ Configuração do Firebase

Crie um arquivo `.env` baseado em `.env.example` com suas credenciais:

```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
```

As variáveis são lidas via `import.meta.env` e nenhuma chave fica hardcoded.

## 🧠 Como evoluir sem poluir

- Preferir funções puras e contratos em `domain` para novas regras de negócio.
- Casos de uso em `application` devem depender apenas das interfaces de repositório.
- Implementações concretas ou integrações externas residem em `infrastructure`.
- Mantenha componentes e hooks coesos em `presentation`, reutilizando utilidades de `shared` quando possível.

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

## ✅ Qualidade e CI

- `.eslintrc.cjs` configurado para React, Hooks e TypeScript.
- `.prettierrc` garante estilo consistente.
- `lint-staged` roda ESLint + Prettier nos arquivos alterados.
- Hooks do Husky (`pre-commit` e `commit-msg`) aplicam lint e Conventional Commits.
- GitHub Actions executa lint e build a cada push.

## ▶️ Uso rápido

```bash
npm install
npm run prepare # instala os hooks do Husky
npm run dev
```

Abra `http://localhost:5173` e navegue pelos fluxos de autenticação. Roles de exemplo: `admin` e `user`.

## 📄 Licença

Distribuído sob a licença MIT. Ajuste conforme necessário.
