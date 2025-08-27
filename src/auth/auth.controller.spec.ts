/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserResponseDto } from '../users/dto/user-response.dto'; // Добавляем импорт

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Мокаем AuthService
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    googleLogin: jest.fn(),
    validateUser: jest.fn(),
    generateTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService, // Добавляем мок
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const mockLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Создаем полный объект UserResponseDto
      const mockUser = new UserResponseDto({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: null, // будет исключен @Exclude()
        googleId: null, // будет исключен @Exclude()
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockTokens = {
        access_token: 'jwt-token-here',
        user: mockUser,
      };

      mockAuthService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(mockLoginDto, mockUser);

      expect(result).toEqual(mockTokens);
      // Исправляем ожидание - сервис вызывается только с loginDto
      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
    });
  });

  // Альтернативный вариант, если контроллер использует @Request() декоратор:
  /*
  describe('login with @Request() decorator', () => {
    it('should return access token on successful login', async () => {
      const mockLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      const mockTokens = {
        access_token: 'jwt-token-here',
        user: mockRequest.user,
      };

      mockAuthService.login.mockResolvedValue(mockTokens);

      // Если метод контроллера выглядит как: login(@Body() loginDto: LoginDto, @Request() req)
      const result = await controller.login(mockLoginDto, mockRequest);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto, mockRequest.user);
    });
  });
  */

  // Пример теста для register
  describe('register', () => {
    it('should register new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      };

      const mockResponse = {
        access_token: 'jwt-token-here',
        user: {
          id: 'user-456',
          email: registerDto.email,
          username: registerDto.username,
        },
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });
});
