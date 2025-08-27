import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Используем email вместо username
      passwordField: 'password', // Поле с паролем
    });
  }

  // Этот метод автоматически вызывается при активации LocalAuthGuard
  async validate(email: string, password: string): Promise<UserResponseDto> {
    // Проверяем пользователя через AuthService
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Возвращаем пользователя - Passport автоматически добавит его в req.user
    return user;
  }
}
