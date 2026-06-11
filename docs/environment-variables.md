# Variáveis de ambiente

As variáveis reais declaradas estão em `.env.example`.

| Variável                            | Uso no código                                              |
| ----------------------------------- | ---------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | `firebaseConfig.apiKey`                                    |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `firebaseConfig.authDomain`                                |
| `VITE_FIREBASE_PROJECT_ID`          | `firebaseConfig.projectId`                                 |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `firebaseConfig.storageBucket`                             |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `firebaseConfig.messagingSenderId`                         |
| `VITE_FIREBASE_APP_ID`              | `firebaseConfig.appId`                                     |
| `VITE_FIREBASE_MEASUREMENT_ID`      | `firebaseConfig.measurementId`                             |
| `VITE_QALITE_SERVICE_URL`           | Declarada no exemplo, mas sem uso em `src` após auditoria. |

## Observações

- Todas as variáveis Firebase são lidas por `import.meta.env` no cliente.
- Como é Vite, somente variáveis com prefixo `VITE_` ficam disponíveis no bundle.
- URLs de Slack são dados persistidos em Firestore, não variáveis de ambiente.
