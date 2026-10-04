import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DraftQuestionModule } from '../modules/draft-question/draft-question.module';

@Module({
  imports: [DraftQuestionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
