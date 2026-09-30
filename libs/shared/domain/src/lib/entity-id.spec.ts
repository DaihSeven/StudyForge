import { DomainError } from './domain-error';
import { EntityId } from './entity-id';

const value = '550e8400-e29b-41d4-a716-446655440000';

describe('EntityId', () => {
  it('keeps a non-empty value', () => {
    const id = EntityId.create(value);

    expect(id.value).toBe(value);
    expect(id.toString()).toBe(value);
  });

  it.each(['', '   '])('rejects an empty value ("%s")', (invalid) => {
    let error: unknown;
    try {
      EntityId.create(invalid);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'INVALID_ENTITY_ID' });
  });

  it('is immutable', () => {
    expect(Object.isFrozen(EntityId.create(value))).toBe(true);
  });

  it('compares by value', () => {
    expect(EntityId.create(value).equals(EntityId.create(value))).toBe(true);
    expect(EntityId.create(value).equals(EntityId.create('other-id'))).toBe(false);
  });
});
