import { DomainError } from './domain-error';
import { OrganizationId } from './organization-id';

describe('OrganizationId', () => {
  it('keeps a non-empty value', () => {
    expect(OrganizationId.create('org-1').value).toBe('org-1');
  });

  it.each(['', '   '])('rejects an empty value ("%s")', (value) => {
    let error: unknown;
    try {
      OrganizationId.create(value);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'INVALID_ORGANIZATION_ID' });
  });
});
