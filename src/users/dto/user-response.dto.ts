import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  email: string;
  username: string;

  @Exclude()
  password: string | null;

  @Exclude()
  googleId: string | null;

  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
