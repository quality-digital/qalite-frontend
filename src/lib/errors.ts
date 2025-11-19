import { FirebaseError } from 'firebase/app';

export type EnvironmentStatusErrorCode = 'PENDING_SCENARIOS' | 'INVALID_ENVIRONMENT';

export class EnvironmentStatusError extends Error {
  constructor(
    public readonly code: EnvironmentStatusErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EnvironmentStatusError';
  }
}

const firebaseErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido. Revise o endereço informado.',
  'auth/invalid-credential': 'E-mail ou senha incorretos. Confira os dados informados.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos. Confira os dados informados.',
  'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
  'auth/user-not-found': 'Não encontramos uma conta para este e-mail.',
  'auth/wrong-password': 'Senha incorreta. Tente novamente.',
  'auth/missing-email': 'Informe um e-mail corporativo para continuar.',
  'auth/missing-password': 'Informe sua senha para continuar.',
  'auth/email-already-in-use': 'Este e-mail já está em uso.',
  'auth/weak-password': 'Sua senha precisa ter pelo menos 6 caracteres.',
  'auth/operation-not-allowed': 'Tipo de login temporariamente indisponível.',
  'auth/account-exists-with-different-credential':
    'Já existe uma conta com este e-mail usando outro método de acesso.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um instante e tente de novo.',
  'auth/network-request-failed': 'Erro de rede. Verifique sua conexão com a internet.',
  'auth/requires-recent-login': 'Faça login novamente para concluir esta ação.',
  'storage/unauthorized': 'Você não tem permissão para enviar este arquivo.',
  'storage/retry-limit-exceeded': 'Não conseguimos finalizar o upload. Tente novamente em breve.',
  'storage/canceled': 'Upload cancelado.',
  'firestore/unavailable': 'Serviço temporariamente indisponível. Tente novamente em instantes.',
};

export const mapFirebaseError = (
  error: unknown,
  fallbackMessage = 'Não foi possível concluir a operação. Tente novamente.',
) => {
  if (error instanceof FirebaseError) {
    return firebaseErrorMessages[error.code] ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
