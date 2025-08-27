import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Get,
  Param,
  Res,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerConfig } from './multer.config';
import { existsSync } from 'fs';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('sets/cover')
  @UseInterceptors(FileInterceptor('cover', multerConfig))
  uploadSetCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Cover image not uploaded');
    }

    this.uploadService.validateImageFile(file);

    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: this.uploadService.getSetCoverUrl(file.filename),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('characters/image')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  uploadCharacterImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Character image not uploaded');
    }

    this.uploadService.validateImageFile(file);

    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: this.uploadService.getCharacterImageUrl(file.filename),
    };
  }

  @Get('sets/:filename')
  getSetCover(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadService.getSetCoverPath(filename);

    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.sendFile(filePath);
  }

  @Get('characters/:filename')
  getCharacterImage(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadService.getCharacterImagePath(filename);

    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.sendFile(filePath);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sets/:filename')
  deleteSetCover(@Param('filename') filename: string) {
    const filePath = this.uploadService.getSetCoverPath(filename);

    if (!existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    const success = this.uploadService.deleteImage(
      this.uploadService.getSetCoverUrl(filename),
      'set',
    );

    if (!success) {
      throw new BadRequestException('Failed to delete file');
    }

    return {
      message: 'File successfully deleted',
      filename,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('characters/:filename')
  deleteCharacterImage(@Param('filename') filename: string) {
    const filePath = this.uploadService.getCharacterImagePath(filename);

    if (!existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    const success = this.uploadService.deleteImage(
      this.uploadService.getCharacterImageUrl(filename),
      'character',
    );

    if (!success) {
      throw new BadRequestException('Failed to delete file');
    }

    return {
      message: 'File successfully deleted',
      filename,
    };
  }
}
