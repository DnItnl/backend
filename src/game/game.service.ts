import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveGameResultsDto } from './dto/save-game-results.dto';
import { ChoiceType } from '@prisma/client';
import { CharacterWithStatsDto } from './dto/character-stats.dto';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async saveGameResults(saveGameResultsDto: SaveGameResultsDto) {
    const { userId, choices } = saveGameResultsDto;

    // Проверяем существование пользователя, если userId указан
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }
    }

    // Проверяем существование всех персонажей
    const characterIds = choices.map((choice) => choice.characterId);
    const characters = await this.prisma.character.findMany({
      where: {
        id: {
          in: characterIds,
        },
      },
    });

    if (characters.length !== characterIds.length) {
      throw new Error('Some characters not found');
    }

    // Создаем сессию и все выборы в транзакции
    const result = await this.prisma.$transaction(async (tx) => {
      // Создаем новую сессию
      const session = await tx.session.create({
        data: {
          userId: userId || undefined,
        },
      });

      // Создаем все выборы
      const createdChoices = await Promise.all(
        choices.map((choice) =>
          tx.choice.create({
            data: {
              sessionId: session.id,
              characterId: choice.characterId,
              type: choice.type,
            },
            include: {
              character: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          }),
        ),
      );

      return {
        sessionId: session.id,
        choices: createdChoices,
        createdAt: session.createdAt,
      };
    });

    // Update character statistics after successful save
    await this.updateCharacterStats(choices);

    return result;
  }

  // Update character statistics based on choices
  private async updateCharacterStats(
    choices: Array<{ characterId: string; type: ChoiceType }>,
  ) {
    // Group choices by character and type for bulk updates
    const statUpdates = new Map<
      string,
      { fuckCount: number; marryCount: number; killCount: number }
    >();

    choices.forEach(({ characterId, type }) => {
      if (!statUpdates.has(characterId)) {
        statUpdates.set(characterId, {
          fuckCount: 0,
          marryCount: 0,
          killCount: 0,
        });
      }

      const stats = statUpdates.get(characterId)!;
      switch (type) {
        case ChoiceType.FUCK:
          stats.fuckCount++;
          break;
        case ChoiceType.MARRY:
          stats.marryCount++;
          break;
        case ChoiceType.KILL:
          stats.killCount++;
          break;
      }
    });

    // Update statistics for each character
    await Promise.all(
      Array.from(statUpdates.entries()).map(([characterId, counts]) =>
        this.prisma.characterStats.upsert({
          where: { characterId },
          create: {
            characterId,
            fuckCount: counts.fuckCount,
            marryCount: counts.marryCount,
            killCount: counts.killCount,
          },
          update: {
            fuckCount: { increment: counts.fuckCount },
            marryCount: { increment: counts.marryCount },
            killCount: { increment: counts.killCount },
          },
        }),
      ),
    );
  }

  async getUserGameHistory(userId: string) {
    // Получаем историю игр пользователя
    const sessions = await this.prisma.session.findMany({
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

    return sessions;
  }

  async getGameStats(userId: string) {
    // Получаем статистику игр пользователя
    const stats = await this.prisma.choice.groupBy({
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

    const totalGames = await this.prisma.session.count({
      where: { userId },
    });

    const totalChoices = await this.prisma.choice.count({
      where: {
        session: {
          userId,
        },
      },
    });

    return {
      totalGames,
      totalChoices,
      choicesByType: stats.reduce(
        (acc, stat) => {
          acc[stat.type] = stat._count.type;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  // Get characters with their statistics for a specific set
  async getCharactersWithStats(
    setId: string,
  ): Promise<CharacterWithStatsDto[]> {
    const characters = await this.prisma.character.findMany({
      where: { setId },
      include: {
        stats: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return characters.map((character) => ({
      id: character.id,
      name: character.name,
      imageUrl: character.imageUrl,
      setId: character.setId,
      stats: character.stats
        ? {
            ...character.stats,
            totalChoices:
              character.stats.fuckCount +
              character.stats.marryCount +
              character.stats.killCount,
            mostPopularChoice: this.getMostPopularChoice(character.stats),
          }
        : {
            id: '',
            characterId: character.id,
            fuckCount: 0,
            marryCount: 0,
            killCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            totalChoices: 0,
            mostPopularChoice: undefined,
          },
    }));
  }

  // Helper method to determine most popular choice
  private getMostPopularChoice(stats: {
    fuckCount: number;
    marryCount: number;
    killCount: number;
  }): 'FUCK' | 'MARRY' | 'KILL' | undefined {
    const { fuckCount, marryCount, killCount } = stats;

    if (fuckCount === 0 && marryCount === 0 && killCount === 0) {
      return undefined;
    }

    if (fuckCount >= marryCount && fuckCount >= killCount) {
      return 'FUCK';
    } else if (marryCount >= killCount) {
      return 'MARRY';
    } else {
      return 'KILL';
    }
  }
}
