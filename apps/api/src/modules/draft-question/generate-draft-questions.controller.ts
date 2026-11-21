import { Controller, Post } from '@nestjs/common';

/** POST /api/draft-questions/generate — streaming SSE. */
@Controller('draft-questions')
export class GenerateDraftQuestionsController {
  @Post('generate')
  async generate(): Promise<void> {
    throw new Error('GenerateDraftQuestionsController ainda não implementado.');
  }
}
