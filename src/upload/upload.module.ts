import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UploadCheckUtil } from './upload-check.util';
import { UploadDiagnosticController } from './upload-diagnostic.controller';

@Module({
  providers: [UploadService, UploadCheckUtil],
  controllers: [UploadController, UploadDiagnosticController],
  exports: [UploadService, UploadCheckUtil],
})
export class UploadModule {}
