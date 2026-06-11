# Dívida técnica

## Melhorias arquiteturais

- A camada `services` hoje é apenas alias dos repositórios Firebase. Ela pode ser removida para simplificação adicional ou ganhar regras de aplicação explícitas para justificar a camada.
- Algumas páginas, especialmente as de loja e ambiente, concentram muita lógica de formulário, filtros, mutations e renderização. Extrair casos de uso/hooks menores reduziria acoplamento.
- A aplicação chama Slack diretamente do navegador. Um backend/proxy reduziria exposição de webhook e permitiria auditoria, rate limiting e masking.

## Acoplamentos excessivos

- Presentation conhece diretamente muitos detalhes de entidades Firestore via services.
- Repositórios Firebase e funções `external` compartilham mapeamentos; uma camada única de data mapper poderia reduzir duplicação.
- i18n é usado em utilitários de exportação, o que acopla geração de arquivos ao singleton global.

## Complexidade desnecessária identificada e tratada

- A implementação manual de XLSX que não era chamada foi removida de `storeImportExport.ts`; a exportação ativa usa ExcelJS em `src/utils/exportExcel.ts`.
- Exports órfãos de tipos/ícones/funções não usados foram removidos para reduzir superfície pública.

## Performance

- O build ainda gera chunks grandes por causa de dependências pesadas como Firebase e ExcelJS. O próprio Vite emite aviso para chunks acima de 500 kB.
- ExcelJS é carregado em chunk separado por importação dinâmica de página/uso, mas ainda produz bundle grande quando a funcionalidade é acessada.
- Listagens usam paginação/cache em alguns pontos, mas páginas grandes podem se beneficiar de virtualização de tabelas.

## Segurança

- Regras Firestore/Storage não estão no repositório; revisar e versionar regras é essencial.
- Webhooks Slack persistidos no Firestore e usados no cliente exigem regras fortes para leitura.
- Credenciais BrowserStack são armazenadas em documentos de usuário/organização; devem ter acesso restrito nas regras Firebase.

## Manutenção

- Adicionar testes automatizados para fluxos críticos de auth, permissões, contadores de cenários e transições de ambiente.
- Considerar `noUnusedLocals`/`noUnusedParameters` no `tsconfig` para manter limpeza contínua.
- Adotar ferramenta de auditoria de exports/dependências quando o registry permitir instalação.
