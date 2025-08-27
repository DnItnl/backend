import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Регистрация нового пользователя
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Создаем пользователя через UsersService
      const user = await this.usersService.createUser(registerDto);

      // Генерируем JWT токен
      const access_token = await this.generateJwtToken(user);

      return new AuthResponseDto(access_token, user);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // Пробрасываем ошибку о существующем email
      }
      throw new Error('Registration failed');
    }
  }

  // Логин пользователя
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Валидируем пользователя и пароль
    const user = await this.usersService.validatePassword(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Генерируем JWT токен
    const access_token = await this.generateJwtToken(user);

    return new AuthResponseDto(access_token, user);
  }

  // Валидация пользователя для Passport Local Strategy
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    return await this.usersService.validatePassword(email, password);
  }

  // Получение пользователя по ID для JWT Strategy
  async validateUserById(userId: string): Promise<UserResponseDto | null> {
    return await this.usersService.findById(userId);
  }

  // Генерация JWT токена
  private async generateJwtToken(user: UserResponseDto): Promise<string> {
    const payload = {
      sub: user.id, // 'sub' - стандартное поле JWT для user ID
      email: user.email,
      username: user.username,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
  }

  // Проверка и расшифровка JWT токена (если нужно где-то вручную)
  async verifyJwtToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
      console.error(error); //todo
    }
  }

  // Метод для Google OAuth (для будущего использования)
  async googleLogin(googleUser: {
    email: string;
    googleId: string;
    username: string;
  }): Promise<AuthResponseDto> {
    // Ищем пользователя по Google ID
    let user = await this.usersService.findByGoogleId(googleUser.googleId);

    if (!user) {
      // Если нет - создаем нового пользователя через Google
      user = await this.usersService.createGoogleUser(
        googleUser.email,
        googleUser.googleId,
        googleUser.username,
      );
    }

    // Генерируем JWT токен
    const access_token = await this.generateJwtToken(user);

    return new AuthResponseDto(access_token, user);
  }
}
