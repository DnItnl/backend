import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../types/jwt-payload.type';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('jwt.secret');

    // Проверяем наличие секрета при инициализации
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      // Дополнительные проверки безопасности
      algorithms: ['HS256'], // Явно указываем алгоритм
    });
  }

  async validate(payload: JwtPayload): Promise<UserResponseDto> {
    // Дополнительная валидация payload
    this.validatePayload(payload);

    const user = await this.authService.validateUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Валидация структуры JWT payload
   */
  private validatePayload(payload: JwtPayload): void {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    if (!payload.email) {
      throw new UnauthorizedException('Invalid token: missing email');
    }

    // Проверка времени жизни токена (дополнительная безопасность)
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Token expired');
    }

    if (payload.iat && payload.iat > now) {
      throw new UnauthorizedException('Token used before issued');
    }
  }
}
