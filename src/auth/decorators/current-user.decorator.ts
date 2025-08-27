import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserResponseDto } from '../../users/dto/user-response.dto';

// Overload для конкретного поля
export function CurrentUser<K extends keyof UserResponseDto>(
  field: K,
): ParameterDecorator;

// Overload для полного объекта пользователя
export function CurrentUser(): ParameterDecorator;

// Реализация декоратора для удобного получения текущего пользователя из req.user
export function CurrentUser(field?: keyof UserResponseDto): ParameterDecorator {
  return createParamDecorator(
    (data: keyof UserResponseDto | undefined, ctx: ExecutionContext) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const request = ctx.switchToHttp().getRequest();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const user: UserResponseDto = request.user;

      if (!user) {
        return null;
      }

      // Если указано конкретное поле - возвращаем его
      // Например: @CurrentUser('email') даст только email
      return field ? user[field] : user;
    },
  )(field, {} as any);
}
