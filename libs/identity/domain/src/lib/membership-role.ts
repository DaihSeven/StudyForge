export const MembershipRole = Object.freeze({
  MENTOR: 'MENTOR',
  STUDENT: 'STUDENT',
} as const);

export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];

export function isMembershipRole(value: unknown): value is MembershipRole {
  return (Object.values(MembershipRole) as unknown[]).includes(value);
}
