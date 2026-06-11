# Arquitetura

## Tipo de sistema

SPA frontend em React/Vite. Não existe backend próprio neste repositório. A camada de infraestrutura conversa diretamente com Firebase e Slack a partir do navegador.

## Camadas

```text
main.tsx
  -> presentation/routes
    -> presentation/providers
      -> pages/components/hooks/context
        -> infrastructure/services
          -> infrastructure/repositories
            -> infrastructure/external
              -> Firebase Auth / Firestore / Storage / Slack
        -> domain/entities e domain/repositories
```

## Relações entre módulos

- `src/main.tsx` importa `AppRoutes`, CSS global e `src/lib/i18n.ts`.
- `AppRoutes` usa lazy loading das páginas e aplica `PublicAppProviders`, `AppProviders`, `ProtectedRoute` e `RoleProtectedRoute`.
- `AppProviders` envolve a árvore com providers de tema, toast, autenticação, branding, notificações admin, preferências e lojas realtime.
- Páginas como `StoreSummaryPage` e `EnvironmentPage` concentram regras de interação e chamam serviços/hook de domínio.
- Serviços são aliases diretos dos repositórios Firebase, reduzindo lógica nessa camada.
- Repositórios Firebase mapeiam métodos dos contratos para funções em `infrastructure/external`.
- `external` contém integração concreta com Firebase, Storage, Slack, exportação e cache Firestore.

## Componentes arquiteturais

| Componente   | Responsabilidade                                                               |
| ------------ | ------------------------------------------------------------------------------ |
| Rotas        | Lazy loading, guards e agrupamento público/autenticado/admin.                  |
| Providers    | Estado global de sessão, tema, toast, preferências, branding e dados realtime. |
| Páginas      | Orquestração de formulários, tabelas, cards e chamadas de serviço.             |
| Hooks        | Abstrações de dados/realtime/time tracking/perfis.                             |
| Serviços     | Fachada estável para páginas/hooks.                                            |
| Repositórios | Contratos e adapters Firebase.                                                 |
| External     | Queries Firestore, Auth, Storage, Slack e exportadores.                        |
| Domain       | Tipos e contratos usados por todas as camadas.                                 |

## Decisões reais observadas

- Firestore é inicializado com `persistentLocalCache` e `persistentMultipleTabManager`, portanto a aplicação usa cache local persistente multiaba.
- As rotas usam `Suspense` e imports dinâmicos para code splitting por página.
- Existe cache próprio `CacheStore` além do cache Firestore para leituras de lojas/ambientes.
- A aplicação usa i18n desde o bootstrap.
- Admin é determinado por role no perfil do usuário, não por custom claims no código atual.

## Diagramas

- [Contexto](./diagrams/system-context.puml)
- [Containers](./diagrams/container-diagram.puml)
- [Componentes](./diagrams/component-diagram.puml)
- [Deploy](./diagrams/deployment-diagram.puml)
