/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SetsService } from './sets.service';
import { CreateSetDto } from './dto/create-set.dto';
import { GetSetsDto } from './dto/get-sets.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from '../upload/upload.service';
import { multerConfig } from '../upload/multer.config';

@Controller('sets')
export class SetsController {
  constructor(
    private readonly setsService: SetsService,
    private readonly uploadService: UploadService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('cover', multerConfig))
  async create(
    @Body() createSetDto: CreateSetDto,
    @Request() req,
    @UploadedFile() coverFile?: Express.Multer.File,
  ) {
    // Если загружается файл обложки, используем его
    if (coverFile) {
      this.uploadService.validateImageFile(coverFile);
      createSetDto.coverUrl = this.uploadService.getSetCoverUrl(
        coverFile.filename,
      );
    }

    // Проверяем, что coverUrl указан
    if (!createSetDto.coverUrl) {
      throw new BadRequestException('Обложка набора обязательна');
    }

    return this.setsService.create(createSetDto, req.user.id);
  }

  @Get()
  findAll(@Query() getSetsDto: GetSetsDto) {
    return this.setsService.findAll(getSetsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMySets(@Query() getSetsDto: GetSetsDto, @Request() req) {
    return this.setsService.getMySets(req.user.id, getSetsDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.setsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('cover', multerConfig))
  async update(
    @Param('id') id: string,
    @Body() updateSetDto: Partial<CreateSetDto>,
    @Request() req,
    @UploadedFile() coverFile?: Express.Multer.File,
  ) {
    // Если загружается новый файл обложки, используем его
    if (coverFile) {
      this.uploadService.validateImageFile(coverFile);
      updateSetDto.coverUrl = this.uploadService.getSetCoverUrl(
        coverFile.filename,
      );
    }

    return this.setsService.update(id, updateSetDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.setsService.remove(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('validate-images')
  validateImages(@Body() createSetDto: CreateSetDto) {
    const validation = this.setsService.validateSetImages(createSetDto);

    if (!validation.valid) {
      throw new BadRequestException(
        `Image validation failed: ${validation.errors.join('; ')}`,
      );
    }

    return {
      valid: true,
      message: 'All images are valid and accessible',
    };
  }
}
