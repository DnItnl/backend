import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Регистрация нового пользователя
   * POST /auth/register
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);

    const result = await this.authService.register(registerDto);

    this.logger.log(`User registered successfully: ${registerDto.email}`);
    return result;
  }

  /**
   * Логин пользователя
   * POST /auth/login
   * Использует LocalAuthGuard для проверки email/password
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<AuthResponseDto> {
    // user уже валидирован LocalAuthGuard через LocalStrategy
    this.logger.log(`Login successful for user: ${user.email}`);

    // Генерируем токен для уже проверенного пользователя
    return this.authService.login(loginDto);
  }
  /**
   * Получить профиль текущего пользователя
   * GET /auth/profile
   * Требует JWT токен в заголовке Authorization
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: UserResponseDto): UserResponseDto {
    this.logger.debug(`Profile requested for user: ${user.id}`);
    return user;
  }

  /**
   * Получить информацию о текущем пользователе (краткая версия)
   * GET /auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getCurrentUser(@CurrentUser() user: UserResponseDto): {
    id: string;
    email: string;
    username: string;
  } {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
    };
  }

  /**
   * Получить только email текущего пользователя
   * GET /auth/me/email
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/email')
  @HttpCode(HttpStatus.OK)
  getCurrentUserEmail(@CurrentUser('email') email: string): { email: string } {
    return { email };
  }

  /**
   * Проверить валидность токена
   * POST /auth/verify
   */
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifyToken(@CurrentUser() user: UserResponseDto): {
    valid: boolean;
    user: UserResponseDto;
  } {
    return {
      valid: true,
      user,
    };
  }

  /**
   * Логаут (пока что просто подтверждение)
   * POST /auth/logout
   * В будущем здесь можно добавить blacklist токенов
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('id') userId: string): { message: string } {
    this.logger.log(`User ${userId} logged out`);

    // TODO: Добавить токен в blacklist при необходимости
    // await this.authService.invalidateToken(token);

    return { message: 'Logged out successfully' };
  }

  /**
   * Обновить токен (refresh)
   * POST /auth/refresh
   * Пока что просто генерируем новый токен для текущего пользователя
   */
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@CurrentUser() user: UserResponseDto): Promise<{
    access_token: string;
  }> {
    this.logger.log(`Token refresh for user: ${user.id}`);

    // В реальном приложении здесь должна быть логика с refresh токенами
    const authResponse = await this.authService.login({
      email: user.email,
      password: '', // Пароль не нужен для refresh
    });

    return { access_token: authResponse.access_token };
  }

  // ==============================================
  // ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ (для будущего использования)
  // ==============================================

  /**
   * Google OAuth Login (заготовка)
   * POST /auth/google
   */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() googleData: { email: string; googleId: string; username: string },
  ): Promise<AuthResponseDto> {
    this.logger.log(`Google login attempt for email: ${googleData.email}`);

    const result = await this.authService.googleLogin(googleData);

    this.logger.log(`Google login successful for email: ${googleData.email}`);
    return result;
  }

  // Метод checkEmailAvailability удален - не реализован в UsersService
}
