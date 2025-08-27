import {
  IsString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChoiceType } from '@prisma/client';

export class ChoiceDto {
  @IsString()
  characterId: string;

  @IsEnum(ChoiceType)
  type: ChoiceType;
}

export class SaveGameResultsDto {
  @IsOptional()
  @IsString()
  userId?: string; // Optional - can come from JWT token or be undefined for anonymous users

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one choice is required' })
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices: ChoiceDto[];
}
