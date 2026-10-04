import { BadRequestException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CreateDraftQuestionUseCase } from '@studyforge/import/application';
import { DraftQuestion, InvalidDraftQuestionError } from '@studyforge/import/domain';
import { CreateDraftQuestionCommand } from '@studyforge/shared/contracts';
import { Alternative, EntityId, err, ok, OrganizationId, QuestionType } from '@studyforge/shared/domain';
import { DraftQuestionController } from './draft-question.controller';

const command: CreateDraftQuestionCommand = {
  organizationId: 'org-123',
  type: QuestionType.SINGLE_CHOICE,
  statement: 'What is AWS?',
  alternatives: [
    { letter: 'A', text: 'Amazon Web Services', isCorrect: true },
    { letter: 'B', text: 'American Web Standard', isCorrect: false },
    { letter: 'C', text: 'Application Web Server', isCorrect: false },
    { letter: 'D', text: 'Automated Web System', isCorrect: false },
  ],
};

describe('DraftQuestionController', () => {
  let controller: DraftQuestionController;
  const execute = jest.fn();

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [DraftQuestionController],
      providers: [{ provide: CreateDraftQuestionUseCase, useValue: { execute } }],
    }).compile();

    controller = moduleRef.get(DraftQuestionController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a draft question and returns 201 with the mapped data', async () => {
    const draft = DraftQuestion.create({
      id: EntityId.create('test-uuid'),
      organizationId: OrganizationId.create(command.organizationId),
      type: command.type,
      statement: command.statement,
      alternatives: command.alternatives.map((alternative) => Alternative.create(alternative)),
    });
    execute.mockResolvedValue(ok(draft));

    const response = await controller.create(command);

    expect(execute).toHaveBeenCalledWith(command);
    expect(response).toEqual({ statusCode: HttpStatus.CREATED, data: { id: 'test-uuid', ...command } });
  });

  it('maps a domain error to 400 with its code and message', async () => {
    execute.mockResolvedValue(err(new InvalidDraftQuestionError('EMPTY_STATEMENT', 'Statement cannot be empty.')));

    const error = await controller.create({ ...command, statement: '' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      code: 'EMPTY_STATEMENT',
      message: 'Statement cannot be empty.',
    });
  });

  it('maps a wrong number of correct answers to 400', async () => {
    execute.mockResolvedValue(
      err(new InvalidDraftQuestionError('INVALID_CORRECT_COUNT', 'SINGLE_CHOICE requires exactly 1 correct alternative(s), got 2.')),
    );

    await expect(controller.create(command)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets unexpected failures propagate (500)', async () => {
    const failure = new Error('database down');
    execute.mockRejectedValue(failure);

    await expect(controller.create(command)).rejects.toBe(failure);
  });
});
