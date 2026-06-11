# Frontend

## Bootstrap

- `src/main.tsx` monta `<AppRoutes />` dentro de `React.StrictMode`.
- `src/lib/i18n.ts` registra recursos `src/locales/pt.json` e `src/locales/en.json`.
- `src/presentation/styles/global.css` contém estilos globais da aplicação.

## Rotas

| Caminho                | Página                   | Provider/Proteção               |
| ---------------------- | ------------------------ | ------------------------------- |
| `/environments/public` | `PublicEnvironmentPage`  | `PublicAppProviders`            |
| `/`                    | `HomePage`               | `AppProviders`                  |
| `/login`               | `LoginPage`              | `AppProviders`                  |
| `/register`            | `RegisterPage`           | `AppProviders`                  |
| `/forgot-password`     | `ForgotPasswordPage`     | `AppProviders`                  |
| `/reset-password`      | `ResetPasswordPage`      | `AppProviders`                  |
| `/403`                 | `ForbiddenPage`          | `AppProviders`                  |
| `/dashboard`           | `UserDashboardPage`      | `ProtectedRoute`                |
| `/no-organization`     | `NoOrganizationPage`     | `ProtectedRoute`                |
| `/profile`             | `ProfilePage`            | `ProtectedRoute`                |
| `/stores`              | `StoreSummaryPage`       | `ProtectedRoute`                |
| `/environments`        | `EnvironmentPage`        | `ProtectedRoute`                |
| `/admin`               | `AdminOrganizationsPage` | `RoleProtectedRoute(['admin'])` |
| `/admin/organizations` | `AdminStoresPage`        | `RoleProtectedRoute(['admin'])` |
| `*`                    | redirect para `/`        | fallback                        |

## Providers e contexts

- `ThemeProvider`: tema claro/escuro/sistema.
- `ToastProvider`: mensagens globais.
- `AuthProvider`: usuário autenticado, login/logout e roles.
- `OrganizationBrandingProvider`: branding da organização/loja.
- `AdminAccessRequestsNotificationsProvider`: solicitações pendentes para admins.
- `UserPreferencesProvider`: sincronização de idioma/tema.
- `StoresRealtimeProvider`: lista de lojas em tempo real.

## Hooks

- `useAuth`: acesso ao contexto de autenticação.
- `useEnvironmentDetails`: detalhes e ações de ambiente.
- `useEnvironmentEngagement`: usuários presentes/participantes.
- `useEnvironmentRealtime`: assinatura de ambiente.
- `useMotion`: animações sequenciadas.
- `useOrganizationStores`: lojas da organização.
- `useScenarioEvidence`: evidências de cenário.
- `useStoreEnvironments`: ambientes de loja.
- `useStoreOrganizationBranding`: branding combinado loja/organização.
- `useTimeTracking`: início/fim/duração de execução.
- `useUserProfiles`: resumos de usuários por ids.

## Componentes principais

Componentes genéricos incluem `Button`, `TextInput`, `TextArea`, `SelectInput`, `Modal`, `ConfirmDeleteModal`, `Alert`, `LoadingSpinner`, `PageLoader`, `PaginationControls`, `PasswordInput`, `PasswordStrengthIndicator`, `UserAvatar`, `CachedImage`, `StoreFavicon`, `SupportCenter`, `Layout` e `AuthLayout`.

Componentes de ambiente incluem `CreateEnvironmentCard`, `EnvironmentCard`, `EnvironmentKanban`, `EnvironmentEvidenceTable`, `EnvironmentSummaryCard`, `EditEnvironmentModal` e `DeleteEnvironmentModal`.

## Estado e comunicação

O estado global fica em contexts. Dados persistentes vêm de serviços Firebase. As páginas mantêm estado local de formulários/filtros/modais e chamam serviços para mutations. Assinaturas realtime usam `onSnapshot` nas funções externas de Firestore.
