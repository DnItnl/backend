import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [CharactersController],
})
export class CharactersModule {}
