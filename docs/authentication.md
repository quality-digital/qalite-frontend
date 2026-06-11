# Autenticação e autorização

## Entidades

`AuthUser` contém `uid`, e-mail, nome, role, organização, foto, credenciais BrowserStack, preferências e verificação de e-mail.

Roles reais:

- `admin`
- `user`

## Fluxo de sessão

1. Firebase Auth notifica mudanças de sessão.
2. O código busca/persiste o perfil em `users`.
3. `AuthProvider` expõe usuário e ações para a UI.
4. `ProtectedRoute` exige usuário autenticado.
5. `RoleProtectedRoute` exige role compatível.

## Login social

Google e GitHub autenticam via Firebase Auth. Depois disso, o perfil em Firestore é criado/atualizado. O código também possui lógica para procurar organização por domínio de e-mail e vincular usuário automaticamente quando aplicável.

## Recuperação de senha

O fluxo usa funções Firebase Auth para envio de e-mail, verificação do código e confirmação de nova senha.

## Solicitações de acesso

Usuários sem organização podem solicitar acesso. Solicitações ficam em `organizations/{organizationId}/accessRequests`; admins podem aprovar, movendo o usuário para membros e atualizando `users/{uid}.organizationId`.

## Diagrama

Veja [authentication-flow.puml](./diagrams/authentication-flow.puml).
