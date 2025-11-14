import { FirebaseError } from 'firebase/app';

const firebaseErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido. Verifique o endereço informado.',
  'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
  'auth/user-not-found': 'Nenhuma conta encontrada para este e-mail.',
  'auth/wrong-password': 'Senha incorreta. Tente novamente.',
  'auth/email-already-in-use': 'Este e-mail já está sendo utilizado por outra conta.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.',
  'auth/network-request-failed': 'Não foi possível conectar-se. Verifique sua conexão com a internet.',
  'auth/requires-recent-login': 'Faça login novamente para confirmar esta operação.',
  'storage/unauthorized': 'Você não tem permissão para enviar este arquivo.',
  'storage/retry-limit-exceeded': 'Não foi possível concluir o upload da imagem. Tente novamente.',
  'storage/canceled': 'Envio cancelado.',
  'firestore/unavailable': 'Serviço temporariamente indisponível. Tente novamente em instantes.'
};

export const mapFirebaseError = (
  error: unknown,
  fallbackMessage = 'Não foi possível concluir a operação. Tente novamente.'
) => {
  if (error instanceof FirebaseError) {
    return firebaseErrorMessages[error.code] ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
