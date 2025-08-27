/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveGameResultsDto } from './dto/save-game-results.dto';
import { ChoiceType } from '@prisma/client';

describe('GameService', () => {
  let service: GameService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    character: {
      findMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    choice: {
      create: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    characterStats: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveGameResults', () => {
    const userId = 'user-123';
    const saveGameResultsDto: SaveGameResultsDto = {
      userId,
      choices: [
        { characterId: 'char-1', type: ChoiceType.FUCK },
        { characterId: 'char-2', type: ChoiceType.MARRY },
        { characterId: 'char-3', type: ChoiceType.KILL },
      ],
    };

    const mockUser = {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
    };

    const mockCharacters = [
      {
        id: 'char-1',
        name: 'Character 1',
        imageUrl: '/uploads/characters/char1.jpg',
      },
      {
        id: 'char-2',
        name: 'Character 2',
        imageUrl: '/uploads/characters/char2.jpg',
      },
      {
        id: 'char-3',
        name: 'Character 3',
        imageUrl: '/uploads/characters/char3.jpg',
      },
    ];

    const mockSession = {
      id: 'session-123',
      userId,
      createdAt: new Date(),
    };

    const mockChoices = [
      {
        id: 'choice-1',
        type: ChoiceType.FUCK,
        sessionId: 'session-123',
        characterId: 'char-1',
        character: {
          id: 'char-1',
          name: 'Character 1',
          imageUrl: '/uploads/characters/char1.jpg',
        },
        createdAt: new Date(),
      },
      {
        id: 'choice-2',
        type: ChoiceType.MARRY,
        sessionId: 'session-123',
        characterId: 'char-2',
        character: {
          id: 'char-2',
          name: 'Character 2',
          imageUrl: '/uploads/characters/char2.jpg',
        },
        createdAt: new Date(),
      },
      {
        id: 'choice-3',
        type: ChoiceType.KILL,
        sessionId: 'session-123',
        characterId: 'char-3',
        character: {
          id: 'char-3',
          name: 'Character 3',
          imageUrl: '/uploads/characters/char3.jpg',
        },
        createdAt: new Date(),
      },
    ];

    it('should save game results successfully with authenticated user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.character.findMany.mockResolvedValue(mockCharacters);

      const mockTransactionResult = {
        sessionId: mockSession.id,
        choices: mockChoices,
        createdAt: mockSession.createdAt,
      };

      mockPrismaService.$transaction.mockResolvedValue(mockTransactionResult);
      mockPrismaService.characterStats.upsert.mockResolvedValue({});

      const result = await service.saveGameResults(saveGameResultsDto);

      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.character.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['char-1', 'char-2', 'char-3'],
          },
        },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.characterStats.upsert).toHaveBeenCalledTimes(3);
    });

    it('should save game results successfully without authenticated user', async () => {
      const saveGameResultsWithoutUserDto: SaveGameResultsDto = {
        userId: undefined,
        choices: [
          { characterId: 'char-1', type: ChoiceType.FUCK },
          { characterId: 'char-2', type: ChoiceType.MARRY },
          { characterId: 'char-3', type: ChoiceType.KILL },
        ],
      };

      mockPrismaService.character.findMany.mockResolvedValue(mockCharacters);

      const mockTransactionResult = {
        sessionId: mockSession.id,
        choices: mockChoices,
        createdAt: mockSession.createdAt,
      };

      mockPrismaService.$transaction.mockResolvedValue(mockTransactionResult);
      mockPrismaService.characterStats.upsert.mockResolvedValue({});

      const result = await service.saveGameResults(
        saveGameResultsWithoutUserDto,
      );

      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.character.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['char-1', 'char-2', 'char-3'],
          },
        },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.characterStats.upsert).toHaveBeenCalledTimes(3);
    });

    it('should throw error when authenticated user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.saveGameResults(saveGameResultsDto)).rejects.toThrow(
        'User not found',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.character.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw error when some characters not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      // Return only 2 characters instead of 3
      mockPrismaService.character.findMany.mockResolvedValue([
        mockCharacters[0],
        mockCharacters[1],
      ]);

      await expect(service.saveGameResults(saveGameResultsDto)).rejects.toThrow(
        'Some characters not found',
      );

      expect(mockPrismaService.character.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['char-1', 'char-2', 'char-3'],
          },
        },
      });
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw error when some characters not found for anonymous user', async () => {
      const saveGameResultsWithoutUserDto: SaveGameResultsDto = {
        userId: undefined,
        choices: [
          { characterId: 'char-1', type: ChoiceType.FUCK },
          { characterId: 'char-2', type: ChoiceType.MARRY },
          { characterId: 'char-3', type: ChoiceType.KILL },
        ],
      };

      // Return only 2 characters instead of 3
      mockPrismaService.character.findMany.mockResolvedValue([
        mockCharacters[0],
        mockCharacters[1],
      ]);

      await expect(
        service.saveGameResults(saveGameResultsWithoutUserDto),
      ).rejects.toThrow('Some characters not found');

      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.character.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['char-1', 'char-2', 'char-3'],
          },
        },
      });
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should handle empty choices array with authenticated user', async () => {
      const emptyChoicesDto = {
        userId,
        choices: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.character.findMany.mockResolvedValue([]);

      const mockTransactionResult = {
        sessionId: mockSession.id,
        choices: [],
        createdAt: mockSession.createdAt,
      };

      mockPrismaService.$transaction.mockResolvedValue(mockTransactionResult);
      mockPrismaService.characterStats.upsert.mockResolvedValue({});

      const result = await service.saveGameResults(emptyChoicesDto);

      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaService.characterStats.upsert).not.toHaveBeenCalled();
    });

    it('should handle empty choices array for anonymous user', async () => {
      const emptyChoicesDto = {
        userId: undefined,
        choices: [],
      };

      mockPrismaService.character.findMany.mockResolvedValue([]);

      const mockTransactionResult = {
        sessionId: mockSession.id,
        choices: [],
        createdAt: mockSession.createdAt,
      };

      mockPrismaService.$transaction.mockResolvedValue(mockTransactionResult);
      mockPrismaService.characterStats.upsert.mockResolvedValue({});

      const result = await service.saveGameResults(emptyChoicesDto);

      expect(result).toEqual(mockTransactionResult);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.characterStats.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getUserGameHistory', () => {
    const userId = 'user-123';
    const mockSessions = [
      {
        id: 'session-1',
        userId,
        createdAt: new Date('2024-01-01'),
        choices: [
          {
            id: 'choice-1',
            type: ChoiceType.FUCK,
            character: {
              id: 'char-1',
              name: 'Character 1',
              imageUrl: '/uploads/characters/char1.jpg',
              set: {
                id: 'set-1',
                name: 'Set 1',
                coverUrl: '/uploads/sets/set1.jpg',
              },
            },
          },
        ],
      },
      {
        id: 'session-2',
        userId,
        createdAt: new Date('2024-01-02'),
        choices: [
          {
            id: 'choice-2',
            type: ChoiceType.MARRY,
            character: {
              id: 'char-2',
              name: 'Character 2',
              imageUrl: '/uploads/characters/char2.jpg',
              set: {
                id: 'set-1',
                name: 'Set 1',
                coverUrl: '/uploads/sets/set1.jpg',
              },
            },
          },
        ],
      },
    ];

    it('should return user game history successfully', async () => {
      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.getUserGameHistory(userId);

      expect(result).toEqual(mockSessions);
      expect(mockPrismaService.session.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          choices: {
            include: {
              character: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  set: {
                    select: {
                      id: true,
                      name: true,
                      coverUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when user has no game history', async () => {
      mockPrismaService.session.findMany.mockResolvedValue([]);

      const result = await service.getUserGameHistory(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getGameStats', () => {
    const userId = 'user-123';
    const mockChoiceStats = [
      { type: ChoiceType.FUCK, _count: { type: 10 } },
      { type: ChoiceType.MARRY, _count: { type: 8 } },
      { type: ChoiceType.KILL, _count: { type: 12 } },
    ];

    it('should return game stats successfully', async () => {
      const totalGames = 15;
      const totalChoices = 30;

      mockPrismaService.choice.groupBy.mockResolvedValue(mockChoiceStats);
      mockPrismaService.session.count.mockResolvedValue(totalGames);
      mockPrismaService.choice.count.mockResolvedValue(totalChoices);

      const result = await service.getGameStats(userId);

      expect(result).toEqual({
        totalGames,
        totalChoices,
        choicesByType: {
          FUCK: 10,
          MARRY: 8,
          KILL: 12,
        },
      });

      expect(mockPrismaService.choice.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: {
          session: {
            userId,
          },
        },
        _count: {
          type: true,
        },
      });

      expect(mockPrismaService.session.count).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(mockPrismaService.choice.count).toHaveBeenCalledWith({
        where: {
          session: {
            userId,
          },
        },
      });
    });

    it('should return zeros when user has no game stats', async () => {
      mockPrismaService.choice.groupBy.mockResolvedValue([]);
      mockPrismaService.session.count.mockResolvedValue(0);
      mockPrismaService.choice.count.mockResolvedValue(0);

      const result = await service.getGameStats(userId);

      expect(result).toEqual({
        totalGames: 0,
        totalChoices: 0,
        choicesByType: {},
      });
    });

    it('should handle partial choice types', async () => {
      const partialStats = [
        { type: ChoiceType.FUCK, _count: { type: 5 } },
        { type: ChoiceType.MARRY, _count: { type: 3 } },
      ];

      mockPrismaService.choice.groupBy.mockResolvedValue(partialStats);
      mockPrismaService.session.count.mockResolvedValue(4);
      mockPrismaService.choice.count.mockResolvedValue(8);

      const result = await service.getGameStats(userId);

      expect(result).toEqual({
        totalGames: 4,
        totalChoices: 8,
        choicesByType: {
          FUCK: 5,
          MARRY: 3,
        },
      });
    });
  });

  describe('getCharactersWithStats', () => {
    const mockCharactersWithStats = [
      {
        id: 'char-1',
        name: 'Character 1',
        imageUrl: '/uploads/characters/char1.jpg',
        setId: 'set-1',
        stats: {
          id: 'stats-1',
          characterId: 'char-1',
          fuckCount: 10,
          marryCount: 5,
          killCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        set: {
          id: 'set-1',
          name: 'Test Set',
          coverUrl: '/uploads/sets/cover.jpg',
        },
      },
      {
        id: 'char-2',
        name: 'Character 2',
        imageUrl: '/uploads/characters/char2.jpg',
        setId: 'set-1',
        stats: null,
        set: {
          id: 'set-1',
          name: 'Test Set',
          coverUrl: '/uploads/sets/cover.jpg',
        },
      },
    ];

    it('should get characters with statistics for a specific set', async () => {
      mockPrismaService.character.findMany.mockResolvedValue(
        mockCharactersWithStats,
      );

      const result = await service.getCharactersWithStats('set-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'char-1',
        name: 'Character 1',
        imageUrl: '/uploads/characters/char1.jpg',
        setId: 'set-1',
        stats: expect.objectContaining({
          totalChoices: 17,
          mostPopularChoice: 'FUCK',
        }),
      });

      expect(result[1].stats).toEqual(
        expect.objectContaining({
          fuckCount: 0,
          marryCount: 0,
          killCount: 0,
          totalChoices: 0,
          mostPopularChoice: undefined,
        }),
      );

      expect(mockPrismaService.character.findMany).toHaveBeenCalledWith({
        where: { setId: 'set-1' },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });
  });
});
