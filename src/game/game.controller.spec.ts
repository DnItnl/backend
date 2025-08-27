import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { SaveGameResultsDto } from './dto/save-game-results.dto';
import { ChoiceType } from '@prisma/client';
import { UserResponseDto } from '../users/dto/user-response.dto';

describe('GameController', () => {
  let controller: GameController;
  let gameService: GameService;

  const mockGameService = {
    saveGameResults: jest.fn(),
    getUserGameHistory: jest.fn(),
    getGameStats: jest.fn(),
    getCharactersWithStats: jest.fn(),
  };

  const mockUser: UserResponseDto = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        {
          provide: GameService,
          useValue: mockGameService,
        },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);
    gameService = module.get<GameService>(GameService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveGameResults', () => {
    const saveGameResultsDto: SaveGameResultsDto = {
      choices: [
        { characterId: 'char-1', type: ChoiceType.FUCK },
        { characterId: 'char-2', type: ChoiceType.MARRY },
        { characterId: 'char-3', type: ChoiceType.KILL },
      ],
    };

    const mockGameResult = {
      sessionId: 'session-123',
      choices: [
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
      ],
      createdAt: new Date(),
    };

    it('should save game results successfully with authenticated user', async () => {
      mockGameService.saveGameResults.mockResolvedValue(mockGameResult);

      const result = await controller.saveGameResults(
        saveGameResultsDto,
        mockUser,
      );

      expect(result).toEqual({
        success: true,
        data: mockGameResult,
        message: 'Game results saved successfully',
      });

      expect(mockGameService.saveGameResults).toHaveBeenCalledWith({
        ...saveGameResultsDto,
        userId: mockUser.id,
      });
    });

    it('should save game results successfully without authenticated user', async () => {
      mockGameService.saveGameResults.mockResolvedValue(mockGameResult);

      const result = await controller.saveGameResults(
        saveGameResultsDto,
        undefined,
      );

      expect(result).toEqual({
        success: true,
        data: mockGameResult,
        message: 'Game results saved successfully',
      });

      expect(mockGameService.saveGameResults).toHaveBeenCalledWith({
        ...saveGameResultsDto,
        userId: undefined,
      });
    });

    it('should override userId from token instead of trusting client', async () => {
      const dtoWithUserId = {
        ...saveGameResultsDto,
        userId: 'malicious-user-id',
      };

      mockGameService.saveGameResults.mockResolvedValue(mockGameResult);

      await controller.saveGameResults(dtoWithUserId, mockUser);

      expect(mockGameService.saveGameResults).toHaveBeenCalledWith({
        ...dtoWithUserId,
        userId: mockUser.id, // Should use userId from token, not from request
      });
    });

    it('should throw HttpException when service throws error', async () => {
      const errorMessage = 'Some characters not found';
      mockGameService.saveGameResults.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.saveGameResults(saveGameResultsDto, mockUser),
      ).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should handle service error without message', async () => {
      mockGameService.saveGameResults.mockRejectedValue(new Error());

      await expect(
        controller.saveGameResults(saveGameResultsDto, mockUser),
      ).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: 'Failed to save game results',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('getUserGameHistory', () => {
    const mockGameHistory = [
      {
        id: 'session-1',
        userId: mockUser.id,
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
        userId: mockUser.id,
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
      mockGameService.getUserGameHistory.mockResolvedValue(mockGameHistory);

      const result = await controller.getUserGameHistory(mockUser.id);

      expect(result).toEqual({
        success: true,
        data: mockGameHistory,
        message: 'Game history retrieved successfully',
      });

      expect(mockGameService.getUserGameHistory).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should return empty history when user has no games', async () => {
      mockGameService.getUserGameHistory.mockResolvedValue([]);

      const result = await controller.getUserGameHistory(mockUser.id);

      expect(result).toEqual({
        success: true,
        data: [],
        message: 'Game history retrieved successfully',
      });
    });

    it('should throw HttpException when service throws error', async () => {
      const errorMessage = 'Database error';
      mockGameService.getUserGameHistory.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.getUserGameHistory(mockUser.id)).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should handle service error without message', async () => {
      mockGameService.getUserGameHistory.mockRejectedValue(new Error());

      await expect(controller.getUserGameHistory(mockUser.id)).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: 'Failed to retrieve game history',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('getGameStats', () => {
    const mockGameStats = {
      totalGames: 15,
      totalChoices: 45,
      choicesByType: {
        FUCK: 15,
        MARRY: 15,
        KILL: 15,
      },
    };

    it('should return game stats successfully', async () => {
      mockGameService.getGameStats.mockResolvedValue(mockGameStats);

      const result = await controller.getGameStats(mockUser.id);

      expect(result).toEqual({
        success: true,
        data: mockGameStats,
        message: 'Game stats retrieved successfully',
      });

      expect(mockGameService.getGameStats).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return zero stats when user has no games', async () => {
      const emptyStats = {
        totalGames: 0,
        totalChoices: 0,
        choicesByType: {},
      };

      mockGameService.getGameStats.mockResolvedValue(emptyStats);

      const result = await controller.getGameStats(mockUser.id);

      expect(result).toEqual({
        success: true,
        data: emptyStats,
        message: 'Game stats retrieved successfully',
      });
    });

    it('should throw HttpException when service throws error', async () => {
      const errorMessage = 'Database connection failed';
      mockGameService.getGameStats.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getGameStats(mockUser.id)).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should handle service error without message', async () => {
      mockGameService.getGameStats.mockRejectedValue(new Error());

      await expect(controller.getGameStats(mockUser.id)).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: 'Failed to retrieve game stats',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
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
          fuckCount: 5,
          marryCount: 3,
          killCount: 2,
          totalChoices: 10,
          mostPopularChoice: 'FUCK',
        },
      },
    ];

    it('should return characters with stats for a specific set', async () => {
      const setId = 'set-1';
      mockGameService.getCharactersWithStats.mockResolvedValue(
        mockCharactersWithStats,
      );

      const result = await controller.getCharactersWithStats(setId);

      expect(result).toEqual({
        success: true,
        data: mockCharactersWithStats,
        message: 'Characters with statistics retrieved successfully',
      });

      expect(mockGameService.getCharactersWithStats).toHaveBeenCalledWith(
        setId,
      );
    });

    it('should throw HttpException when service throws error', async () => {
      const errorMessage = 'Service unavailable';
      mockGameService.getCharactersWithStats.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.getCharactersWithStats('set-1')).rejects.toThrow(
        new HttpException(
          {
            success: false,
            message: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });
});
