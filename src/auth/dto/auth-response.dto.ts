import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  access_token: string;
  user: UserResponseDto;

  constructor(access_token: string, user: UserResponseDto) {
    this.access_token = access_token;
    this.user = user;
  }
}
