import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSetDto } from './dto/create-set.dto';
import { GetSetsDto } from './dto/get-sets.dto';
import {
  SetWithOwner,
  SetWithDetails,
  PaginatedResponse,
} from './types/pagination.types';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class SetsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(
    createSetDto: CreateSetDto,
    userId: string,
  ): Promise<SetWithDetails> {
    const { characters, ...setData } = createSetDto;

    // Only validate images in production/development, skip in test environment
    if (process.env.NODE_ENV !== 'test') {
      // Validate that cover image exists
      if (!this.uploadService.validateImageExists(setData.coverUrl, 'set')) {
        throw new BadRequestException(
          `Cover image not found: ${setData.coverUrl}`,
        );
      }

      // Validate that all character images exist
      const characterImageUrls = characters.map((char) => char.imageUrl);
      const imageValidation = this.uploadService.validateImagesExist(
        characterImageUrls,
        'character',
      );

      if (!imageValidation.valid) {
        throw new BadRequestException(
          `Character images not found: ${imageValidation.missingImages.join(', ')}`,
        );
      }
    }

    const set = await this.prisma.set.create({
      data: {
        ...setData,
        ownerId: userId,
        characters: {
          create: characters,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            characters: true,
          },
        },
      },
    });

    return set;
  }

  async findAll(
    getSetsDto: GetSetsDto,
  ): Promise<PaginatedResponse<SetWithOwner>> {
    // const { page = 1, limit = 10, search } = getSetsDto;
    const limit = Number(getSetsDto.limit ?? 10);
    const page = Number(getSetsDto.page ?? 1);
    const search = getSetsDto.search ?? '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    const [sets, total] = await Promise.all([
      this.prisma.set.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              characters: true,
            },
          },
        },
      }),
      this.prisma.set.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: sets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<SetWithDetails> {
    const set = await this.prisma.set.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            characters: true,
          },
        },
      },
    });

    if (!set) {
      throw new NotFoundException(`Set with id ${id} not found`);
    }

    return set;
  }

  async update(
    id: string,
    updateSetDto: Partial<CreateSetDto>,
    userId: string,
  ): Promise<SetWithDetails> {
    const existingSet = await this.prisma.set.findUnique({
      where: { id },
    });

    if (!existingSet) {
      throw new NotFoundException(`Набор с ID ${id} не найден`);
    }

    if (existingSet.ownerId !== userId) {
      throw new ForbiddenException(
        'Вы можете редактировать только свои наборы',
      );
    }

    const { characters, ...setData } = updateSetDto;

    // Only validate images in production/development, skip in test environment
    if (process.env.NODE_ENV !== 'test') {
      // Validate cover image if provided
      if (
        setData.coverUrl &&
        !this.uploadService.validateImageExists(setData.coverUrl, 'set')
      ) {
        throw new BadRequestException(
          `Cover image not found: ${setData.coverUrl}`,
        );
      }

      // Validate character images if provided
      if (characters) {
        const characterImageUrls = characters.map((char) => char.imageUrl);
        const imageValidation = this.uploadService.validateImagesExist(
          characterImageUrls,
          'character',
        );

        if (!imageValidation.valid) {
          throw new BadRequestException(
            `Character images not found: ${imageValidation.missingImages.join(', ')}`,
          );
        }
      }
    }

    // If we're updating characters, handle existing ones
    if (characters) {
      // Get existing character images for cleanup
      const existingCharacters = await this.prisma.character.findMany({
        where: { setId: id },
        select: { imageUrl: true },
      });

      // Delete existing character records
      await this.prisma.character.deleteMany({
        where: { setId: id },
      });

      // Clean up old character image files (only in non-test environment)
      if (process.env.NODE_ENV !== 'test') {
        const oldImageUrls = existingCharacters.map((char) => char.imageUrl);
        this.uploadService.deleteImages(oldImageUrls, 'character');
      }
    }

    const set = await this.prisma.set.update({
      where: { id },
      data: {
        ...setData,
        ...(characters && {
          characters: {
            create: characters,
          },
        }),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            characters: true,
          },
        },
      },
    });

    return set;
  }

  async remove(id: string, userId: string): Promise<void> {
    const existingSet = await this.prisma.set.findUnique({
      where: { id },
      include: {
        characters: {
          select: {
            imageUrl: true,
          },
        },
      },
    });

    if (!existingSet) {
      throw new NotFoundException(`Набор с ID ${id} не найден`);
    }

    if (existingSet.ownerId !== userId) {
      throw new ForbiddenException('Вы можете удалять только свои наборы');
    }

    // Получаем все URL изображений для удаления
    const characterImageUrls = existingSet.characters.map(
      (char) => char.imageUrl,
    );
    const coverUrl = existingSet.coverUrl as string;

    // Сначала удаляем персонажей, затем набор
    await this.prisma.character.deleteMany({
      where: { setId: id },
    });

    await this.prisma.set.delete({
      where: { id },
    });

    // Удаляем файлы изображений после успешного удаления из БД (только в non-test среде)
    if (process.env.NODE_ENV !== 'test') {
      try {
        // Удаляем обложку набора
        this.uploadService.deleteImage(coverUrl, 'set');

        // Удаляем изображения персонажей
        this.uploadService.deleteImages(characterImageUrls, 'character');
      } catch (error: unknown) {
        // Логируем ошибку, но не прерываем операцию, так как данные уже удалены из БД
        console.error(
          'Failed to delete some image files:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  /**
   * Validates that all images for a set exist (used for admin/debugging)
   */
  validateSetImages(createSetDto: CreateSetDto): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate cover image
    if (!this.uploadService.validateImageExists(createSetDto.coverUrl, 'set')) {
      errors.push(`Cover image not found: ${createSetDto.coverUrl}`);
    }

    // Validate character images
    const characterImageUrls = createSetDto.characters.map(
      (char) => char.imageUrl,
    );
    const imageValidation = this.uploadService.validateImagesExist(
      characterImageUrls,
      'character',
    );

    if (!imageValidation.valid) {
      errors.push(
        `Character images not found: ${imageValidation.missingImages.join(', ')}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async getMySets(
    userId: string,
    getSetsDto: GetSetsDto,
  ): Promise<PaginatedResponse<SetWithOwner>> {
    const { page = 1, limit = 10, search } = getSetsDto;
    const skip = (page - 1) * limit;

    const where = {
      ownerId: userId,
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const [sets, total] = await Promise.all([
      this.prisma.set.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              characters: true,
            },
          },
        },
      }),
      this.prisma.set.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: sets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }
}
