export type AiProviderErrorCode =
  | 'AI_PROVIDER_RATE_LIMITED'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_PROVIDER_BAD_RESPONSE';

/**
 * Falha do provedor de IA (limite, timeout, HTTP, resposta fora do contrato). A mensagem é segura
 * para o mentor: nunca contém a chave, cabeçalhos nem o corpo bruto da resposta do provedor.
 */
export class AiProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
