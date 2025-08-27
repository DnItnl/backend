import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      let uploadPath: string;

      // Определяем папку назначения по типу файла
      if (req.url.includes('/sets/')) {
        uploadPath = './uploads/sets';
      } else if (req.url.includes('/characters/')) {
        uploadPath = './uploads/characters';
      } else {
        uploadPath = './uploads';
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Генерируем уникальное имя файла
      const extension = extname(file.originalname);
      const filename = `${uuidv4()}${extension}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Допустимые форматы: JPG, JPEG, PNG, WEBP, GIF',
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
