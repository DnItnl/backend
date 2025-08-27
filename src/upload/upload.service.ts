import { Injectable, BadRequestException } from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadPath = join(process.cwd(), 'uploads');
  private readonly allowedImageTypes = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
  ];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor() {
    // Создаем директории для загрузки если их нет
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    const directories = [
      this.uploadPath,
      join(this.uploadPath, 'sets'),
      join(this.uploadPath, 'characters'),
    ];

    directories.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File not uploaded');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size should not exceed 5MB');
    }

    const fileExtension = extname(file.originalname).toLowerCase();
    if (!this.allowedImageTypes.includes(fileExtension)) {
      throw new BadRequestException(
        'Allowed formats: JPG, JPEG, PNG, WEBP, GIF',
      );
    }
  }

  generateFileName(originalName: string): string {
    const extension = extname(originalName);
    const uniqueName = `${uuidv4()}${extension}`;
    return uniqueName;
  }

  getSetCoverPath(filename: string): string {
    return join(this.uploadPath, 'sets', filename);
  }

  getCharacterImagePath(filename: string): string {
    return join(this.uploadPath, 'characters', filename);
  }

  getSetCoverUrl(filename: string): string {
    return `/uploads/sets/${filename}`;
  }

  getCharacterImageUrl(filename: string): string {
    return `/uploads/characters/${filename}`;
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  /**
   * Validates if image file exists in uploads directory
   */
  validateImageExists(imageUrl: string, type: 'set' | 'character'): boolean {
    if (!imageUrl) {
      return false;
    }

    // Check if URL has correct format
    const expectedPrefix =
      type === 'set' ? '/uploads/sets/' : '/uploads/characters/';
    if (!imageUrl.startsWith(expectedPrefix)) {
      return false;
    }

    // Extract filename from URL (e.g., "/uploads/sets/uuid.jpg" -> "uuid.jpg")
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    if (!filename || filename.length < 5) {
      // At least "a.jpg"
      return false;
    }

    const expectedPath =
      type === 'set'
        ? this.getSetCoverPath(filename)
        : this.getCharacterImagePath(filename);

    return existsSync(expectedPath);
  }

  /**
   * Validates multiple image URLs exist
   */
  validateImagesExist(
    imageUrls: string[],
    type: 'set' | 'character',
  ): { valid: boolean; missingImages: string[] } {
    const missingImages: string[] = [];

    for (const imageUrl of imageUrls) {
      if (!this.validateImageExists(imageUrl, type)) {
        missingImages.push(imageUrl);
      }
    }

    return {
      valid: missingImages.length === 0,
      missingImages,
    };
  }

  /**
   * Deletes image file from uploads directory
   */
  deleteImage(imageUrl: string, type: 'set' | 'character'): boolean {
    if (!imageUrl) {
      return false;
    }

    // Check if URL has correct format
    const expectedPrefix =
      type === 'set' ? '/uploads/sets/' : '/uploads/characters/';
    if (!imageUrl.startsWith(expectedPrefix)) {
      return false;
    }

    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    if (!filename || filename.length < 5) {
      // At least "a.jpg"
      return false;
    }

    const filePath =
      type === 'set'
        ? this.getSetCoverPath(filename)
        : this.getCharacterImagePath(filename);

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete image ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Deletes multiple image files
   */
  deleteImages(
    imageUrls: string[],
    type: 'set' | 'character',
  ): { deleted: string[]; failed: string[] } {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const imageUrl of imageUrls) {
      if (this.deleteImage(imageUrl, type)) {
        deleted.push(imageUrl);
      } else {
        failed.push(imageUrl);
      }
    }

    return { deleted, failed };
  }
}
