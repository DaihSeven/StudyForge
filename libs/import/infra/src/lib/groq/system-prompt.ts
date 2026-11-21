export interface SystemPromptOptions {
  readonly quantity: number;
  readonly alternativesPerQuestion: number;
}

export const MATERIAL_OPEN_TAG = '<material>';
export const MATERIAL_CLOSE_TAG = '</material>';

export function buildSystemPrompt(options: SystemPromptOptions): string {
  void options;
  throw new Error('buildSystemPrompt ainda não implementado.');
}

export function buildUserMessage(text: string): string {
  void text;
  throw new Error('buildUserMessage ainda não implementado.');
}
