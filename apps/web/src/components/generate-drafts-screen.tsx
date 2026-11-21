'use client';

export interface GenerateDraftsScreenProps {
  /** TEMPORÁRIO até o Marco 3.2 (autenticação): vêm de NEXT_PUBLIC_DEMO_ORGANIZATION_ID. */
  readonly organizationId: string | null;
  /** TEMPORÁRIO até o Marco 3.2 (autenticação): vêm de NEXT_PUBLIC_DEMO_MENTOR_ID. */
  readonly mentorId: string | null;
  readonly maxInputChars?: number;
  readonly fetchImpl?: typeof fetch;
}

export function GenerateDraftsScreen(_props: GenerateDraftsScreenProps) {
  throw new Error('GenerateDraftsScreen ainda não implementado.');
}
