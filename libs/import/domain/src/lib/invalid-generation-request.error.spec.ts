import { DomainError } from '@studyforge/shared/domain';
import { InvalidGenerationRequestError } from './invalid-generation-request.error';

describe('InvalidGenerationRequestError', () => {
  it('is a DomainError exposing its code and message', () => {
    const error = new InvalidGenerationRequestError('INVALID_QUANTITY', 'Quantity must be a positive integer.');

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('INVALID_QUANTITY');
    expect(error.name).toBe('InvalidGenerationRequestError');
  });
});
