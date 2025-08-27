import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CharacterStatsResponseDto {
  @IsString()
  id: string;

  @IsString()
  characterId: string;

  @IsNumber()
  @Min(0)
  fuckCount: number;

  @IsNumber()
  @Min(0)
  marryCount: number;

  @IsNumber()
  @Min(0)
  killCount: number;

  createdAt: Date;
  updatedAt: Date;

  // Computed fields
  totalChoices?: number;
  mostPopularChoice?: 'FUCK' | 'MARRY' | 'KILL';
}

export class CharacterWithStatsDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  imageUrl: string;

  @IsString()
  setId: string;

  @IsOptional()
  stats?: CharacterStatsResponseDto;
}
