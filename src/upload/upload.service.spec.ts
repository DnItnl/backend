import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockUnlinkSync = unlinkSync as jest.MockedFunction<typeof unlinkSync>;

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockExistsSync.mockReturnValue(true);
  });

  describe('constructor', () => {
    it('should create upload directories if they do not exist', () => {
      mockExistsSync.mockReturnValueOnce(false);
      mockExistsSync.mockReturnValueOnce(false);
      mockExistsSync.mockReturnValueOnce(false);

      new UploadService();

      expect(mockMkdirSync).toHaveBeenCalledTimes(3);
      expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
    });

    it('should not create directories if they already exist', () => {
      mockExistsSync.mockReturnValue(true);

      new UploadService();

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('validateImageFile', () => {
    it('should throw BadRequestException if file is not provided', () => {
      expect(() =>
        service.validateImageFile(null as unknown as Express.Multer.File),
      ).toThrow(new BadRequestException('Файл не загружен'));

      expect(() =>
        service.validateImageFile(undefined as unknown as Express.Multer.File),
      ).toThrow(new BadRequestException('Файл не загружен'));
    });

    it('should throw BadRequestException if file size exceeds limit', () => {
      const largeFile: Express.Multer.File = {
        fieldname: 'test',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB - exceeds 5MB limit
        buffer: Buffer.from(''),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      expect(() => service.validateImageFile(largeFile)).toThrow(
        new BadRequestException('Размер файла не должен превышать 5MB'),
      );
    });

    it('should throw BadRequestException for invalid file extensions', () => {
      const invalidFile: Express.Multer.File = {
        fieldname: 'test',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from(''),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      expect(() => service.validateImageFile(invalidFile)).toThrow(
        new BadRequestException(
          'Допустимые форматы: JPG, JPEG, PNG, WEBP, GIF',
        ),
      );
    });

    it('should not throw for valid image files', () => {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

      validExtensions.forEach((ext) => {
        const validFile: Express.Multer.File = {
          fieldname: 'test',
          originalname: `test${ext}`,
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from(''),
          destination: '',
          filename: '',
          path: '',
          stream: null as any,
        };

        expect(() => service.validateImageFile(validFile)).not.toThrow();
      });
    });
  });

  describe('generateFileName', () => {
    it('should generate unique filename with original extension', () => {
      const originalName = 'test.jpg';
      const generatedName = service.generateFileName(originalName);

      expect(generatedName).toMatch(/^[a-f0-9-]{36}\.jpg$/i);
      expect(generatedName.length).toBeGreaterThan(36);
      expect(generatedName).toContain('.jpg');
    });

    it('should preserve file extension', () => {
      const extensions = ['.png', '.jpeg', '.webp', '.gif'];

      extensions.forEach((ext) => {
        const originalName = `test${ext}`;
        const generatedName = service.generateFileName(originalName);

        expect(generatedName).toContain(ext);
      });
    });
  });

  describe('path and URL methods', () => {
    const filename = 'test-file.jpg';

    it('should return correct set cover path', () => {
      const path = service.getSetCoverPath(filename);
      expect(path).toContain('sets');
      expect(path).toContain(filename);
    });

    it('should return correct character image path', () => {
      const path = service.getCharacterImagePath(filename);
      expect(path).toContain('characters');
      expect(path).toContain(filename);
    });

    it('should return correct set cover URL', () => {
      const url = service.getSetCoverUrl(filename);
      expect(url).toBe(`/uploads/sets/${filename}`);
    });

    it('should return correct character image URL', () => {
      const url = service.getCharacterImageUrl(filename);
      expect(url).toBe(`/uploads/characters/${filename}`);
    });

    it('should return upload path', () => {
      const path = service.getUploadPath();
      expect(path).toBeDefined();
    });
  });

  describe('validateImageExists', () => {
    it('should return false for empty or null imageUrl', () => {
      expect(service.validateImageExists('', 'set')).toBe(false);
      expect(
        service.validateImageExists(null as unknown as string, 'set'),
      ).toBe(false);
      expect(
        service.validateImageExists(
          undefined as unknown as string,
          'character',
        ),
      ).toBe(false);
    });

    it('should return false for invalid URL format', () => {
      expect(service.validateImageExists('invalid-url', 'set')).toBe(false);
      expect(service.validateImageExists('/uploads/', 'character')).toBe(false);
    });

    it('should check file existence for set images', () => {
      const imageUrl = '/uploads/sets/test-file.jpg';
      mockExistsSync.mockReturnValue(true);

      const result = service.validateImageExists(imageUrl, 'set');

      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith(
        expect.stringContaining('sets/test-file.jpg'),
      );
    });

    it('should check file existence for character images', () => {
      const imageUrl = '/uploads/characters/test-file.jpg';
      mockExistsSync.mockReturnValue(false);

      const result = service.validateImageExists(imageUrl, 'character');

      expect(result).toBe(false);
      expect(mockExistsSync).toHaveBeenCalledWith(
        expect.stringContaining('characters/test-file.jpg'),
      );
    });
  });

  describe('validateImagesExist', () => {
    it('should return valid true when all images exist', () => {
      mockExistsSync.mockReturnValue(true);

      const imageUrls = [
        '/uploads/characters/char1.jpg',
        '/uploads/characters/char2.jpg',
      ];

      const result = service.validateImagesExist(imageUrls, 'character');

      expect(result.valid).toBe(true);
      expect(result.missingImages).toEqual([]);
    });

    it('should return missing images when some do not exist', () => {
      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const imageUrls = [
        '/uploads/characters/char1.jpg',
        '/uploads/characters/missing.jpg',
        '/uploads/characters/char3.jpg',
      ];

      const result = service.validateImagesExist(imageUrls, 'character');

      expect(result.valid).toBe(false);
      expect(result.missingImages).toEqual(['/uploads/characters/missing.jpg']);
    });
  });

  describe('deleteImage', () => {
    it('should return false for empty imageUrl', () => {
      const result = service.deleteImage('', 'set');
      expect(result).toBe(false);
    });

    it('should return false for invalid URL format', () => {
      const result = service.deleteImage('invalid-url', 'set');
      expect(result).toBe(false);
    });

    it('should delete existing file and return true', () => {
      const imageUrl = '/uploads/sets/test-file.jpg';
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => {});

      const result = service.deleteImage(imageUrl, 'set');

      expect(result).toBe(true);
      expect(mockUnlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('sets/test-file.jpg'),
      );
    });

    it('should return false when file does not exist', () => {
      const imageUrl = '/uploads/sets/missing.jpg';
      mockExistsSync.mockReturnValue(false);

      const result = service.deleteImage(imageUrl, 'set');

      expect(result).toBe(false);
    });
  });

  describe('deleteImages', () => {
    it('should delete multiple images and return results', () => {
      const imageUrls = [
        '/uploads/characters/char1.jpg',
        '/uploads/characters/char2.jpg',
        '/uploads/characters/missing.jpg',
      ];

      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockUnlinkSync.mockImplementation(() => {});

      const result = service.deleteImages(imageUrls, 'character');

      expect(result.deleted).toEqual([
        '/uploads/characters/char1.jpg',
        '/uploads/characters/char2.jpg',
      ]);
      expect(result.failed).toEqual(['/uploads/characters/missing.jpg']);
    });
  });
});
