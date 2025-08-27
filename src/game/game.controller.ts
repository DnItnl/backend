/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GameService } from './game.service';
import { SaveGameResultsDto } from './dto/save-game-results.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Controller('game')
// @UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('save-results')
  async saveGameResults(
    @Body() saveGameResultsDto: SaveGameResultsDto,
    @CurrentUser() user?: UserResponseDto,
  ) {
    try {
      // Override userId from token if user is authenticated, otherwise use undefined
      const gameData = { ...saveGameResultsDto, userId: user?.id };
      const result = await this.gameService.saveGameResults(gameData);
      return {
        success: true,
        data: result,
        message: 'Game results saved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to save game results',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getUserGameHistory(@CurrentUser('id') userId: string) {
    try {
      const history = await this.gameService.getUserGameHistory(userId);
      return {
        success: true,
        data: history,
        message: 'Game history retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve game history',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getGameStats(@CurrentUser('id') userId: string) {
    try {
      const stats = await this.gameService.getGameStats(userId);
      return {
        success: true,
        data: stats,
        message: 'Game stats retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve game stats',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('characters-with-stats/:setId')
  async getCharactersWithStats(@Param('setId') setId: string) {
    try {
      const characters = await this.gameService.getCharactersWithStats(setId);
      return {
        success: true,
        data: characters,
        message: 'Characters with statistics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error.message || 'Failed to retrieve characters with statistics',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
