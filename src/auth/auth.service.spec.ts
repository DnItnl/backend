/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// auth.service.spec.ts
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: '1',
    email: 'test@test.com',
    username: 'tester',
  };

  beforeEach(() => {
    usersService = {
      createUser: jest.fn(),
      validatePassword: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      createGoogleUser: jest.fn(),
    } as any;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
      verifyAsync: jest.fn().mockResolvedValue({ sub: '1' }),
    } as any;

    configService = {
      get: jest.fn((key) => (key === 'jwt.secret' ? 'secret' : '3600s')),
    } as any;

    authService = new AuthService(usersService, jwtService, configService);
  });

  it('register: should create user and return token', async () => {
    usersService.createUser.mockResolvedValue(mockUser as any);

    const result = await authService.register({
      email: 'test@test.com',
      password: '123',
      username: 'tester',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usersService.createUser).toHaveBeenCalled();
    expect(result.access_token).toBe('signed-jwt');
    expect(result.user).toEqual(mockUser);
  });

  it('login: should throw UnauthorizedException if user not found', async () => {
    usersService.validatePassword.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login: should return token if user valid', async () => {
    usersService.validatePassword.mockResolvedValue(mockUser as any);

    const result = await authService.login({
      email: 'test@test.com',
      password: '123',
    });

    expect(result.access_token).toBe('signed-jwt');
    expect(result.user).toEqual(mockUser);
  });
});
