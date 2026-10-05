import { EntityId, OrganizationId } from '@studyforge/shared/domain';
import { Membership } from './membership';
import { MembershipRole } from './membership-role';
import { Organization } from './organization';
import { User } from './user';

const userId = EntityId.create('user-1');
const organizationId = OrganizationId.create('org-1');

function errorOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected function to throw');
}

describe('User', () => {
  it('keeps id, trimmed email and name, and is immutable', () => {
    const user = User.create({ id: userId, email: '  ana@example.com ', name: 'Ana' });

    expect(user).toMatchObject({ id: userId, email: 'ana@example.com', name: 'Ana' });
    expect(Object.isFrozen(user)).toBe(true);
  });

  it('has no organizationId (linked through Membership)', () => {
    expect(User.create({ id: userId, email: 'ana@example.com', name: 'Ana' })).not.toHaveProperty('organizationId');
  });

  it.each(['', 'ana', 'ana@', '@example.com', 'ana@example', 'a na@example.com'])('rejects email "%s"', (email) => {
    expect(errorOf(() => User.create({ id: userId, email, name: 'Ana' }))).toMatchObject({ code: 'INVALID_EMAIL' });
  });

  it.each(['', '   '])('rejects an empty name ("%s")', (name) => {
    expect(errorOf(() => User.create({ id: userId, email: 'ana@example.com', name }))).toMatchObject({
      code: 'EMPTY_USER_NAME',
    });
  });

  it('requires an id', () => {
    const error = errorOf(() =>
      User.create({ id: undefined as unknown as EntityId, email: 'ana@example.com', name: 'Ana' }),
    );

    expect(error).toMatchObject({ code: 'INVALID_ENTITY_ID' });
  });
});

describe('Organization', () => {
  it('uses the OrganizationId as its own id', () => {
    const organization = Organization.create({ id: organizationId, name: 'Escola X' });

    expect(organization).toMatchObject({ id: organizationId, name: 'Escola X' });
    expect(Object.isFrozen(organization)).toBe(true);
  });

  it.each(['', '   '])('rejects an empty name ("%s")', (name) => {
    expect(errorOf(() => Organization.create({ id: organizationId, name }))).toMatchObject({
      code: 'EMPTY_ORGANIZATION_NAME',
    });
  });

  it('requires an OrganizationId', () => {
    const error = errorOf(() => Organization.create({ id: undefined as unknown as OrganizationId, name: 'Escola X' }));

    expect(error).toMatchObject({ code: 'INVALID_ORGANIZATION_ID' });
  });
});

describe('Membership', () => {
  const id = EntityId.create('membership-1');

  it.each([MembershipRole.MENTOR, MembershipRole.STUDENT])('links a user to an organization as %s', (role) => {
    const membership = Membership.create({ id, userId, organizationId, role });

    expect(membership).toMatchObject({ id, userId, organizationId, role });
    expect(Object.isFrozen(membership)).toBe(true);
  });

  it('rejects an unknown role', () => {
    const error = errorOf(() =>
      Membership.create({ id, userId, organizationId, role: 'ADMIN' as MembershipRole }),
    );

    expect(error).toMatchObject({ code: 'INVALID_MEMBERSHIP_ROLE' });
  });

  it('requires an organizationId', () => {
    const error = errorOf(() =>
      Membership.create({ id, userId, organizationId: undefined as unknown as OrganizationId, role: 'MENTOR' }),
    );

    expect(error).toMatchObject({ code: 'INVALID_ORGANIZATION_ID' });
  });

  it.each([
    ['id', { id: undefined as unknown as EntityId }],
    ['userId', { userId: undefined as unknown as EntityId }],
  ])('requires %s', (_, override) => {
    const error = errorOf(() => Membership.create({ id, userId, organizationId, role: 'STUDENT', ...override }));

    expect(error).toMatchObject({ code: 'INVALID_ENTITY_ID' });
  });
});
