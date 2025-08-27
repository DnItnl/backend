import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Body,
  Param,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from '../upload/upload.service';
import { multerConfig } from '../upload/multer.config';
import { IsString } from 'class-validator';

export class UploadCharacterImageDto {
  @IsString()
  name: string;
}

@Controller('characters')
export class CharactersController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  uploadCharacterImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadCharacterImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('Файл изображения персонажа не загружен');
    }

    this.uploadService.validateImageFile(file);

    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: this.uploadService.getCharacterImageUrl(file.filename),
      characterName: uploadDto.name,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/image')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  updateCharacterImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл изображения не загружен');
    }

    this.uploadService.validateImageFile(file);

    return {
      characterId: id,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: this.uploadService.getCharacterImageUrl(file.filename),
    };
  }
}
