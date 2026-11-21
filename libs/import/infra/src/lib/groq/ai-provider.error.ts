import { QuestionDraftGeneratorError } from '@studyforge/import/application';

export const MANUAL_IMPORT_HINT = 'Use a importação manual (JSON ou Markdown) para continuar.';

export type AiProviderErrorCode =
  | 'AI_PROVIDER_RATE_LIMITED'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_PROVIDER_BAD_RESPONSE';

/**
 * Falha do provedor de IA (limite, timeout, HTTP, resposta fora do contrato). A mensagem é segura
 * para o mentor: nunca contém a chave, cabeçalhos nem o corpo bruto da resposta do provedor.
 * `refundable`: a falha ocorreu antes de qualquer resposta do provedor (a cota pode ser devolvida).
 */
export class AiProviderError extends QuestionDraftGeneratorError {
  declare readonly code: AiProviderErrorCode;

  constructor(code: AiProviderErrorCode, message: string, refundable = false) {
    super(code, message, false);
    void refundable;
    this.name = 'AiProviderError';
  }
}
