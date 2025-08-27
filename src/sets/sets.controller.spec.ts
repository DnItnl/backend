// sets/__tests__/sets.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SetsController } from './sets.controller';
import { SetsService } from './sets.service';
import { CreateSetDto } from './dto/create-set.dto';
import { GetSetsDto } from './dto/get-sets.dto';
import { UploadService } from '../upload/upload.service';

describe('SetsController', () => {
  let controller: SetsController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: SetsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let uploadService: UploadService;

  const mockSetsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getMySets: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUploadService = {
    validateImageFile: jest.fn(),
    getSetCoverUrl: jest.fn(),
    getCharacterImageUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetsController],
      providers: [
        {
          provide: SetsService,
          useValue: mockSetsService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    controller = module.get<SetsController>(SetsController);
    service = module.get<SetsService>(SetsService);
    uploadService = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new set', async () => {
      const createSetDto: CreateSetDto = {
        name: 'Test Set',
        description: 'Test Description',
        coverUrl: 'http://example.com/cover.jpg',
        characters: Array.from({ length: 12 }, (_, i) => ({
          name: `Character ${i + 1}`,
          imageUrl: `http://example.com/image${i + 1}.jpg`,
        })),
      };

      const mockRequest = { user: { id: 'user-123' } };
      const mockResult = {
        id: 'set-123',
        ...createSetDto,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSetsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(
        createSetDto,
        mockRequest,
        undefined,
      );

      expect(result).toEqual(mockResult);
      expect(mockSetsService.create).toHaveBeenCalledWith(
        createSetDto,
        'user-123',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated sets', async () => {
      const getSetsDto: GetSetsDto = { page: 1, limit: 10 };
      const mockResult = {
        data: [
          {
            id: 'set-1',
            name: 'Set 1',
            description: 'Description 1',
            coverUrl: 'http://example.com/cover1.jpg',
            ownerId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockSetsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(getSetsDto);

      expect(result).toEqual(mockResult);
      expect(mockSetsService.findAll).toHaveBeenCalledWith(getSetsDto);
    });
  });

  describe('findOne', () => {
    it('should return a specific set', async () => {
      const setId = 'set-123';
      const mockResult = {
        id: setId,
        name: 'Test Set',
        description: 'Test Description',
        coverUrl: 'http://example.com/cover.jpg',
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        characters: [
          {
            id: 'char-1',
            name: 'Character 1',
            imageUrl: 'http://example.com/char1.jpg',
          },
        ],
      };

      mockSetsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(setId);

      expect(result).toEqual(mockResult);
      expect(mockSetsService.findOne).toHaveBeenCalledWith(setId);
    });
  });

  describe('getMySets', () => {
    it('should return user sets', async () => {
      const getSetsDto: GetSetsDto = { page: 1, limit: 5 };
      const mockRequest = { user: { id: 'user-123' } };
      const mockResult = {
        data: [
          {
            id: 'set-1',
            name: 'My Set',
            description: 'My Description',
            coverUrl: 'http://example.com/mycover.jpg',
            ownerId: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 5,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockSetsService.getMySets.mockResolvedValue(mockResult);

      const result = await controller.getMySets(getSetsDto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockSetsService.getMySets).toHaveBeenCalledWith(
        'user-123',
        getSetsDto,
      );
    });
  });
});
