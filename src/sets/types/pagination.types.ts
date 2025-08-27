import { Prisma } from '@prisma/client';

// Типы для Set с различными include опциями
export type SetWithOwner = Prisma.SetGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
      };
    };
    _count: {
      select: {
        characters: true;
      };
    };
  };
}>;

export type SetWithDetails = Prisma.SetGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
      };
    };
    characters: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
      };
    };
    _count: {
      select: {
        characters: true;
      };
    };
  };
}>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
