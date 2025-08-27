import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SetsService } from './sets.service';
import { PrismaService } from './../prisma/prisma.service';
import { CreateSetDto } from './dto/create-set.dto';
import { UploadService } from '../upload/upload.service';

describe('SetsService', () => {
  let service: SetsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let uploadService: UploadService;

  const mockPrismaService = {
    set: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    character: {
      deleteMany: jest.fn(),
    },
  };

  const mockUploadService = {
    validateImageExists: jest.fn(),
    validateImagesExist: jest.fn(),
    deleteImage: jest.fn(),
    deleteImages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    service = module.get<SetsService>(SetsService);
    prismaService = module.get<PrismaService>(PrismaService);
    uploadService = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createSetDto: CreateSetDto = {
      name: 'Test Set',
      description: 'Test Description',
      coverUrl: '/uploads/sets/cover-uuid.jpg',
      characters: Array.from({ length: 12 }, (_, i) => ({
        name: `Character ${i + 1}`,
        imageUrl: `/uploads/characters/image${i + 1}-uuid.jpg`,
      })),
    };

    const userId = 'user-123';

    const mockCreatedSet = {
      id: 'set-123',
      name: 'Test Set',
      description: 'Test Description',
      coverUrl: '/uploads/sets/cover-uuid.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: userId,
      owner: {
        id: userId,
        username: 'testuser',
      },
      characters: createSetDto.characters.map((char, i) => ({
        id: `char-${i}`,
        name: char.name,
        imageUrl: char.imageUrl,
      })),
      _count: {
        characters: 12,
      },
    };

    it('should create a new set successfully', async () => {
      mockUploadService.validateImageExists.mockReturnValue(true);
      mockUploadService.validateImagesExist.mockReturnValue({
        valid: true,
        missingImages: [],
      });
      mockPrismaService.set.create.mockResolvedValue(mockCreatedSet);

      const result = await service.create(createSetDto, userId);

      expect(result).toEqual(mockCreatedSet);
      expect(mockPrismaService.set.create).toHaveBeenCalledWith({
        data: {
          name: createSetDto.name,
          description: createSetDto.description,
          coverUrl: createSetDto.coverUrl,
          ownerId: userId,
          characters: {
            create: createSetDto.characters,
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
    });
  });

  describe('create - image validation', () => {
    const createSetDto: CreateSetDto = {
      name: 'Test Set',
      description: 'Test Description',
      coverUrl: '/uploads/sets/cover-uuid.jpg',
      characters: Array.from({ length: 12 }, (_, i) => ({
        name: `Character ${i + 1}`,
        imageUrl: `/uploads/characters/image${i + 1}-uuid.jpg`,
      })),
    };
    const userId = 'user-123';

    beforeEach(() => {
      // Reset all mocks for this describe block
      jest.clearAllMocks();
      // Set NODE_ENV to production to enable validation
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      // Reset NODE_ENV back to test
      process.env.NODE_ENV = 'test';
    });

    it('should validate cover image exists before creating set', async () => {
      mockUploadService.validateImageExists.mockReturnValue(false);

      await expect(service.create(createSetDto, userId)).rejects.toThrow(
        new BadRequestException(
          `Cover image not found: ${createSetDto.coverUrl}`,
        ),
      );

      expect(mockUploadService.validateImageExists).toHaveBeenCalledWith(
        createSetDto.coverUrl,
        'set',
      );
    });

    it('should validate all character images exist before creating set', async () => {
      mockUploadService.validateImageExists.mockReturnValue(true);
      mockUploadService.validateImagesExist.mockReturnValue({
        valid: false,
        missingImages: [
          '/uploads/characters/missing1.jpg',
          '/uploads/characters/missing2.jpg',
        ],
      });

      await expect(service.create(createSetDto, userId)).rejects.toThrow(
        new BadRequestException(
          'Character images not found: /uploads/characters/missing1.jpg, /uploads/characters/missing2.jpg',
        ),
      );

      const characterImageUrls = createSetDto.characters.map(
        (char) => char.imageUrl,
      );
      expect(mockUploadService.validateImagesExist).toHaveBeenCalledWith(
        characterImageUrls,
        'character',
      );
    });
  });

  describe('findAll', () => {
    const mockSets = [
      {
        id: 'set-1',
        name: 'Set 1',
        description: 'Description 1',
        coverUrl: '/uploads/sets/cover1-uuid.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: 'user-1',
        owner: { id: 'user-1', username: 'user1' },
        _count: { characters: 15 },
      },
      {
        id: 'set-2',
        name: 'Set 2',
        description: 'Description 2',
        coverUrl: '/uploads/sets/cover2-uuid.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: 'user-2',
        owner: { id: 'user-2', username: 'user2' },
        _count: { characters: 20 },
      },
    ];

    it('should return paginated sets', async () => {
      const getSetsDto = { page: 1, limit: 10 };
      const totalCount = 25;

      mockPrismaService.set.findMany.mockResolvedValue(mockSets);
      mockPrismaService.set.count.mockResolvedValue(totalCount);

      const result = await service.findAll(getSetsDto);

      expect(result.data).toEqual(mockSets);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrevious: false,
      });

      expect(mockPrismaService.set.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
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
      });
    });

    it('should apply search filter when search provided', async () => {
      const getSetsDto = { page: 1, limit: 10, search: 'test' };

      mockPrismaService.set.findMany.mockResolvedValue([]);
      mockPrismaService.set.count.mockResolvedValue(0);

      await service.findAll(getSetsDto);

      expect(mockPrismaService.set.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              name: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
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
      });
    });
  });

  describe('findOne', () => {
    const setId = 'set-123';
    const mockSet = {
      id: setId,
      name: 'Test Set',
      description: 'Test Description',
      coverUrl: '/uploads/sets/cover-uuid.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: 'user-123',
      owner: {
        id: 'user-123',
        username: 'testuser',
      },
      characters: [
        {
          id: 'char-1',
          name: 'Character 1',
          imageUrl: '/uploads/characters/char1-uuid.jpg',
        },
      ],
      _count: {
        characters: 1,
      },
    };

    it('should return set when found', async () => {
      mockPrismaService.set.findUnique.mockResolvedValue(mockSet);

      const result = await service.findOne(setId);

      expect(result).toEqual(mockSet);
      expect(mockPrismaService.set.findUnique).toHaveBeenCalledWith({
        where: { id: setId },
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
    });

    it('should throw NotFoundException when set not found', async () => {
      mockPrismaService.set.findUnique.mockResolvedValue(null);

      await expect(service.findOne(setId)).rejects.toThrow(
        new NotFoundException(`Set with id ${setId} not found`),
      );
    });
  });

  describe('remove', () => {
    const setId = 'set-123';
    const userId = 'user-123';
    const otherUserId = 'user-456';

    const mockSet = {
      id: setId,
      ownerId: userId,
      name: 'Test Set',
      description: 'Test Description',
      coverUrl: '/uploads/sets/cover-uuid.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete set when user is owner', async () => {
      const mockSetWithCharacters = {
        ...mockSet,
        characters: [
          { imageUrl: '/uploads/characters/char1.jpg' },
          { imageUrl: '/uploads/characters/char2.jpg' },
        ],
        coverUrl: '/uploads/sets/cover.jpg',
      };

      mockPrismaService.set.findUnique.mockResolvedValue(mockSetWithCharacters);
      mockPrismaService.character.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaService.set.delete.mockResolvedValue(mockSet);
      mockUploadService.deleteImage.mockReturnValue(true);
      mockUploadService.deleteImages.mockReturnValue({
        deleted: [
          '/uploads/characters/char1.jpg',
          '/uploads/characters/char2.jpg',
        ],
        failed: [],
      });

      await service.remove(setId, userId);

      expect(mockPrismaService.character.deleteMany).toHaveBeenCalledWith({
        where: { setId },
      });
      expect(mockPrismaService.set.delete).toHaveBeenCalledWith({
        where: { id: setId },
      });
      // These methods are only called in non-test environment
      expect(mockUploadService.deleteImage).not.toHaveBeenCalled();
      expect(mockUploadService.deleteImages).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when set not found', async () => {
      mockPrismaService.set.findUnique.mockResolvedValue(null);

      await expect(service.remove(setId, userId)).rejects.toThrow(
        new NotFoundException(`Набор с ID ${setId} не найден`),
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const mockSetWithCharacters = {
        ...mockSet,
        characters: [],
      };
      mockPrismaService.set.findUnique.mockResolvedValue(mockSetWithCharacters);

      await expect(service.remove(setId, otherUserId)).rejects.toThrow(
        new ForbiddenException('Вы можете удалять только свои наборы'),
      );
    });
  });
});
