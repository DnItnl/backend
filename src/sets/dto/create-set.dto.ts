import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCharacterDto {
  @IsString()
  name: string;

  @IsString()
  imageUrl: string;
}

export class CreateSetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  coverUrl: string;

  @IsArray()
  @ArrayMinSize(3, { message: 'minimum number of characters: 12' })
  @ArrayMaxSize(60, { message: 'maximum number of characters: 60' })
  @ValidateNested({ each: true })
  @Type(() => CreateCharacterDto)
  characters: CreateCharacterDto[];
}
