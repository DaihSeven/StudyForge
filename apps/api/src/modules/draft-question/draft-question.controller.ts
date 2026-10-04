import { BadRequestException, Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CreateDraftQuestionUseCase } from '@studyforge/import/application';
import { CreateDraftQuestionCommand, CreateDraftQuestionCommandSchema } from '@studyforge/shared/contracts';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';

/** HTTP → use case → HTTP. Sem regra de negócio: erros de domínio viram 400 com o `code`. */
@Controller('draft-questions')
export class DraftQuestionController {
  constructor(private readonly createDraftQuestion: CreateDraftQuestionUseCase) {}

  @Post()
  async create(@Body(new ZodValidationPipe(CreateDraftQuestionCommandSchema)) command: CreateDraftQuestionCommand) {
    const result = await this.createDraftQuestion.execute(command);

    if (result.isErr()) {
      throw new BadRequestException({ code: result.error.code, message: result.error.message });
    }

    const draft = result.value;
    return {
      statusCode: HttpStatus.CREATED,
      data: {
        id: draft.id.value,
        organizationId: draft.organizationId.value,
        type: draft.type,
        statement: draft.statement,
        alternatives: draft.alternatives.map((alternative) => ({
          letter: alternative.letter,
          text: alternative.text,
          isCorrect: alternative.isCorrect,
        })),
      },
    };
  }
}
