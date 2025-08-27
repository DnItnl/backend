import {
  Injectable,
  ConflictException,
  // NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, username } = createUserDto;

    // Проверяем уникальность email
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создаем пользователя
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

    return new UserResponseDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? new UserResponseDto(user) : null;
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? new UserResponseDto(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    return user ? new UserResponseDto(user) : null;
  }

  async validatePassword(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return new UserResponseDto(user);
  }

  // Метод для создания пользователя через Google OAuth (для будущего использования)
  async createGoogleUser(
    email: string,
    googleId: string,
    username: string,
  ): Promise<UserResponseDto> {
    // Проверяем, есть ли уже пользователь с таким email
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Если есть пользователь с таким email, привязываем Google ID
      const updatedUser = await this.prisma.user.update({
        where: { email },
        data: { googleId },
      });
      return new UserResponseDto(updatedUser);
    }

    // Создаем нового пользователя через Google
    const user = await this.prisma.user.create({
      data: {
        email,
        googleId,
        username,
        password: null, // Пароль null для Google пользователей
      },
    });

    return new UserResponseDto(user);
  }

  // Добавьте эти методы в ваш UsersService:

  /**
   * Получить всех пользователей
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => new UserResponseDto(user));
  }

  /**
   * Обновить пользователя
   */
  async updateUser(
    id: string,
    updateData: Partial<CreateUserDto>,
  ): Promise<UserResponseDto> {
    // Если обновляется пароль - хэшируем его
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    // Проверяем уникальность email при обновлении
    if (updateData.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateData.email,
          NOT: { id }, // Исключаем текущего пользователя
        },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return new UserResponseDto(updatedUser);
  }

  /**
   * Удалить пользователя
   */
  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Проверить доступность email (если понадобится в будущем)
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return !user;
  }
}
