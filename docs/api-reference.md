# Referência de API interna

Esta referência descreve os serviços/repositórios internos consumidos pelo frontend. Não há endpoints HTTP próprios neste repositório.

## `authService`

Origem: `src/infrastructure/services/authService.ts`.

Métodos:

- `register({ email, password, displayName, role? })`
- `login({ email, password })`
- `loginWithGoogle()`
- `loginWithGithub()`
- `logout()`
- `sendPasswordReset(email)`
- `verifyPasswordResetCode(code)`
- `confirmPasswordReset(code, newPassword)`
- `getCurrent()`
- `subscribeToAuthChanges(onChange)`
- `hasRequiredRole(user, allowedRoles)`
- `updateProfile(payload)`

## `organizationService`

- `list()`
- `getById(id)`
- `listSummary()`
- `getDetail(id)`
- `create(payload)`
- `update(id, payload)`
- `uploadLogo(organizationId, file)`
- `delete(id)`
- `addUser(payload)`
- `removeUser(payload)`
- `requestAccess(payload)`
- `cancelAccessRequest(payload)`
- `approveAccessRequest({ organizationId, requestId })`
- `getUserOrganizationByUserId(userId)`

## `storeService`

- `listByOrganization(organizationId)`
- `getById(id)`
- `listSummary(organizationId)`
- `getDetail(id)`
- `create(payload)`
- `update(id, payload)`
- `delete(id)`
- `listScenarios(storeId)`
- `listenToScenarios(storeId, onChange, onError?)`
- `createScenario(payload)`
- `updateScenario(storeId, scenarioId, payload)`
- `deleteScenario(storeId, scenarioId)`
- `listSuites(storeId)`
- `listenToSuites(storeId, onChange, onError?)`
- `createSuite(payload)`
- `updateSuite(storeId, suiteId, payload)`
- `deleteSuite(storeId, suiteId)`
- `listCategories(storeId)`
- `createCategory(payload)`
- `updateCategory(storeId, categoryId, payload)`
- `deleteCategory(storeId, categoryId)`
- `exportStore(storeId)`

## `environmentService`

- `create(input)`
- `update(id, input)`
- `delete(id)`
- `observeEnvironment(id, onChange)`
- `observeAll(filters, onChange)`
- `listSummary(filters)`
- `addUser(id, userId)`
- `removeUser(id, userId)`
- `updateScenarioStatus(environmentId, scenarioId, status, platform?)`
- `uploadScenarioEvidence(environmentId, scenarioId, evidenceLinkOrFile)`
- `transitionStatus(params)`
- `exportAsPDF(environment, participantProfiles?, store?, organization?)`
- `copyAsMarkdown(environment, participantProfiles?, storeName?)`

## `userService`

- `getSummariesByIds(ids)`
- `searchByTerm(term)`
