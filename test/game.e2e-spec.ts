import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { GameModule } from '../src/game/game.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ChoiceType } from '@prisma/client';

describe('Game (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let testUser: any;
  let testSet: any;
  let testCharacters: any[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GameModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Clean up test data
    await prisma.choice.deleteMany();
    await prisma.session.deleteMany();
    await prisma.character.deleteMany();
    await prisma.set.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'testgame@example.com',
        username: 'testgameuser',
        password: 'hashedpassword',
      },
    });

    // Create test set
    testSet = await prisma.set.create({
      data: {
        name: 'Test Game Set',
        description: 'A set for testing game functionality',
        coverUrl: '/uploads/sets/test-cover.jpg',
        ownerId: testUser.id,
      },
    });

    // Create test characters
    testCharacters = await Promise.all([
      prisma.character.create({
        data: {
          name: 'Character 1',
          imageUrl: '/uploads/characters/char1.jpg',
          setId: testSet.id,
        },
      }),
      prisma.character.create({
        data: {
          name: 'Character 2',
          imageUrl: '/uploads/characters/char2.jpg',
          setId: testSet.id,
        },
      }),
      prisma.character.create({
        data: {
          name: 'Character 3',
          imageUrl: '/uploads/characters/char3.jpg',
          setId: testSet.id,
        },
      }),
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.choice.deleteMany();
    await prisma.session.deleteMany();
    await prisma.character.deleteMany();
    await prisma.set.deleteMany();
    await prisma.user.deleteMany();

    await app.close();
  });

  describe('GameService Integration', () => {
    it('should save game results successfully via service', async () => {
      const gameService = app.get('GameService');

      const gameData = {
        userId: testUser.id,
        choices: [
          { characterId: testCharacters[0].id, type: ChoiceType.FUCK },
          { characterId: testCharacters[1].id, type: ChoiceType.MARRY },
          { characterId: testCharacters[2].id, type: ChoiceType.KILL },
        ],
      };

      const result = await gameService.saveGameResults(gameData);

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: expect.any(String),
          choices: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: ChoiceType.FUCK,
              sessionId: expect.any(String),
              characterId: testCharacters[0].id,
              character: expect.objectContaining({
                id: testCharacters[0].id,
                name: 'Character 1',
                imageUrl: '/uploads/characters/char1.jpg',
              }),
            }),
            expect.objectContaining({
              id: expect.any(String),
              type: ChoiceType.MARRY,
              sessionId: expect.any(String),
              characterId: testCharacters[1].id,
              character: expect.objectContaining({
                id: testCharacters[1].id,
                name: 'Character 2',
                imageUrl: '/uploads/characters/char2.jpg',
              }),
            }),
            expect.objectContaining({
              id: expect.any(String),
              type: ChoiceType.KILL,
              sessionId: expect.any(String),
              characterId: testCharacters[2].id,
              character: expect.objectContaining({
                id: testCharacters[2].id,
                name: 'Character 3',
                imageUrl: '/uploads/characters/char3.jpg',
              }),
            }),
          ]),
          createdAt: expect.any(Date),
        }),
      );

      // Verify data was saved in database
      const session = await prisma.session.findFirst({
        where: { userId: testUser.id },
        include: {
          choices: {
            include: {
              character: true,
            },
          },
        },
      });

      expect(session).toBeTruthy();
      expect(session.choices).toHaveLength(3);
      expect(session.choices.map((c) => c.type)).toEqual(
        expect.arrayContaining([
          ChoiceType.FUCK,
          ChoiceType.MARRY,
          ChoiceType.KILL,
        ]),
      );
    });

    it('should throw error for invalid character ID', async () => {
      const gameService = app.get('GameService');

      const gameData = {
        userId: testUser.id,
        choices: [
          { characterId: 'invalid-character-id', type: ChoiceType.FUCK },
        ],
      };

      await expect(gameService.saveGameResults(gameData)).rejects.toThrow(
        'Some characters not found',
      );
    });

    it('should throw error for non-existent user', async () => {
      const gameService = app.get('GameService');

      const gameData = {
        userId: 'invalid-user-id',
        choices: [{ characterId: testCharacters[0].id, type: ChoiceType.FUCK }],
      };

      await expect(gameService.saveGameResults(gameData)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('Game History Integration', () => {
    beforeAll(async () => {
      // Create some test game sessions
      const session1 = await prisma.session.create({
        data: { userId: testUser.id },
      });

      const session2 = await prisma.session.create({
        data: { userId: testUser.id },
      });

      // Create choices for sessions
      await prisma.choice.createMany({
        data: [
          {
            sessionId: session1.id,
            characterId: testCharacters[0].id,
            type: ChoiceType.FUCK,
          },
          {
            sessionId: session1.id,
            characterId: testCharacters[1].id,
            type: ChoiceType.MARRY,
          },
          {
            sessionId: session2.id,
            characterId: testCharacters[2].id,
            type: ChoiceType.KILL,
          },
        ],
      });
    });

    it('should return user game history via service', async () => {
      const gameService = app.get('GameService');

      const history = await gameService.getUserGameHistory(testUser.id);

      expect(history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            userId: testUser.id,
            createdAt: expect.any(Date),
            choices: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                type: expect.any(String),
                character: expect.objectContaining({
                  id: expect.any(String),
                  name: expect.any(String),
                  imageUrl: expect.any(String),
                  set: expect.objectContaining({
                    id: testSet.id,
                    name: 'Test Game Set',
                    coverUrl: '/uploads/sets/test-cover.jpg',
                  }),
                }),
              }),
            ]),
          }),
        ]),
      );

      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('/game/stats (GET)', () => {
    it('should return user game statistics', async () => {
      const res      expect(stats).toEqual(
        expect.objectContaining({
          totalGames: expect.any(Number),
          totalChoices: expect.any(Number),
          choicesByType: expect.objectContaining({
            FUCK: expect.any(Number),
            MARRY: expect.any(Number),
            KILL: expect.any(Number),
          }),
 = await request(app.getHttpServer())
        .get('/game/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalGames: expect.any      FUCK              }),
      )  }),
        message: 'Game stats retrieved successfully',
      });

      expect(response.body.data.totalGames).toBeGreaterThanOrEqual(2);
      expect(response.body.data.totalChoices).toBeGreaterThanOrEqual(4);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/game/stats')
        .expect(401);
    });

    it('should return zero stats for new user', async () => {
      // Create a new user with no game history
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'hashedpassword',
        },
      });

      const newUserToken = jwtService.sign({ sub: newUser.id });

      const response = await request(app.getHttpServer())
        .get('/game/stats')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          totalGames: 0,
          totalChoices: 0,
          choicesByType: {},
        },
        message: 'Game stats retrieved successfully',
      });

      // Clean up
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });

  describe('Game flow integration', () => {
    it('should handle complete game flow', async () => {
      const initialStatsResponse = await request(app.getHttpServer())
        .get('/game/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialStats = initialStatsResponse.body.data;

      // Save game results
      const gameData = {
        choices: [
          { characterId: testCharacters[0].id, type: ChoiceType.MARRY },
          { characterId: testCharacters[1].id, type: ChoiceType.KILL },
          { characterId: testCharacters[2].id, type: ChoiceType.FUCK },
        ],
      };

      const saveResponse = await request(app.getHttpServer())
        .post('/game/save-results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameData)
        .expect(201);

      expect(saveResponse.body.success).toBe(true);
      const sessionId = saveResponse.body.data.sessionId;

      // Check updated stats
      const updatedStatsResponse = await request(app.getHttpServer())
        .get('/game/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedStats = updatedStatsResponse.body.data;
      expect(updatedStats.totalGames).toBe(initialStats.totalGames + 1);
      expect(updatedStats.totalChoices).toBe(initialStats.totalChoices + 3);

      // Check history contains new session
      const history(
        (Res,
      ponse = await request(app.getHttpServer())
        .get('/game/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const sessions = historyResponse.body.data;
      const newSession = sessions.find((s: any) => s.id === sessionId);

      expect(newSession).toBeTruthy();
      expect(newSession.choices).toHaveLength(3);
      expect(newSession.choices.map((c: any) => c.type)).toEqual(
        expect.arrayContaining([
          ChoiceType.MARRY,
          ChoiceType.KILL,
          ChoiceType.FUCK,
        ]),
      );
    });
  });
});
