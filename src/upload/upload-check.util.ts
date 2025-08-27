import { Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  readFileSync,
} from 'fs';
import { join } from 'path';

@Injectable()
export class UploadCheckUtil {
  private readonly uploadPath = join(process.cwd(), 'uploads');
  private readonly requiredDirectories = ['sets', 'characters'];

  /**
   * Performs a comprehensive system check for upload functionality
   */
  performSystemCheck(): UploadSystemStatus {
    const status: UploadSystemStatus = {
      overall: 'healthy',
      checks: [],
      errors: [],
      warnings: [],
    };

    // Check upload directory exists
    status.checks.push(this.checkUploadDirectory());

    // Check subdirectories exist
    for (const dir of this.requiredDirectories) {
      status.checks.push(this.checkSubDirectory(dir));
    }

    // Check write permissions
    status.checks.push(this.checkWritePermissions());

    // Check read permissions
    status.checks.push(this.checkReadPermissions());

    // Check disk space
    status.checks.push(this.checkDiskSpace());

    // Collect errors and warnings
    status.checks.forEach((check) => {
      if (!check.passed) {
        status.errors.push(`${check.name}: ${check.message}`);
      }
      if (check.warning) {
        status.warnings.push(`${check.name}: ${check.warning}`);
      }
    });

    // Determine overall status
    if (status.errors.length > 0) {
      status.overall = 'error';
    } else if (status.warnings.length > 0) {
      status.overall = 'warning';
    }

    return status;
  }

  /**
   * Automatically fixes common upload system issues
   */
  autoFix(): UploadFixResult {
    const result: UploadFixResult = {
      success: true,
      actions: [],
      errors: [],
    };

    try {
      // Create main upload directory if missing
      if (!existsSync(this.uploadPath)) {
        mkdirSync(this.uploadPath, { recursive: true });
        result.actions.push(
          `Created main upload directory: ${this.uploadPath}`,
        );
      }

      // Create subdirectories if missing
      for (const dir of this.requiredDirectories) {
        const dirPath = join(this.uploadPath, dir);
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
          result.actions.push(`Created subdirectory: ${dirPath}`);
        }

        // Create .gitkeep files if missing
        const gitkeepPath = join(dirPath, '.gitkeep');
        if (!existsSync(gitkeepPath)) {
          const content = `# This file ensures the uploads/${dir} directory is preserved in git\n# Uploaded ${dir === 'sets' ? 'set cover' : 'character'} images will be stored here\n`;
          writeFileSync(gitkeepPath, content);
          result.actions.push(`Created .gitkeep file: ${gitkeepPath}`);
        }
      }
    } catch (error: unknown) {
      result.success = false;
      result.errors.push(
        `Auto-fix failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  }

  /**
   * Gets detailed statistics about the upload system
   */
  async getUploadStats(): Promise<UploadStats> {
    const stats: UploadStats = {
      directories: {},
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null,
    };

    try {
      for (const dir of this.requiredDirectories) {
        const dirPath = join(this.uploadPath, dir);
        const dirStats = await this.getDirectoryStats(dirPath);
        stats.directories[dir] = dirStats;
        stats.totalFiles += dirStats.fileCount;
        stats.totalSize += dirStats.totalSize;

        if (
          dirStats.oldestFile &&
          (!stats.oldestFile ||
            dirStats.oldestFile.date < stats.oldestFile.date)
        ) {
          stats.oldestFile = dirStats.oldestFile;
        }

        if (
          dirStats.newestFile &&
          (!stats.newestFile ||
            dirStats.newestFile.date > stats.newestFile.date)
        ) {
          stats.newestFile = dirStats.newestFile;
        }
      }
    } catch {
      // Stats collection failed, but this shouldn't break the system
    }

    return stats;
  }

  private checkUploadDirectory(): SystemCheck {
    try {
      if (!existsSync(this.uploadPath)) {
        return {
          name: 'Upload Directory',
          passed: false,
          message: `Upload directory does not exist: ${this.uploadPath}`,
        };
      }

      return {
        name: 'Upload Directory',
        passed: true,
        message: 'Upload directory exists',
      };
    } catch (error: unknown) {
      return {
        name: 'Upload Directory',
        passed: false,
        message: `Error checking upload directory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private checkSubDirectory(dirName: string): SystemCheck {
    const dirPath = join(this.uploadPath, dirName);

    try {
      if (!existsSync(dirPath)) {
        return {
          name: `${dirName} Directory`,
          passed: false,
          message: `Subdirectory does not exist: ${dirPath}`,
        };
      }

      return {
        name: `${dirName} Directory`,
        passed: true,
        message: `Subdirectory exists: ${dirPath}`,
      };
    } catch (error: unknown) {
      return {
        name: `${dirName} Directory`,
        passed: false,
        message: `Error checking subdirectory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private checkWritePermissions(): SystemCheck {
    const testFile = join(this.uploadPath, 'write-test.tmp');

    try {
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);

      return {
        name: 'Write Permissions',
        passed: true,
        message: 'Write permissions OK',
      };
    } catch (error: unknown) {
      return {
        name: 'Write Permissions',
        passed: false,
        message: `Cannot write to upload directory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private checkReadPermissions(): SystemCheck {
    try {
      const testFile = join(this.uploadPath, 'read-test.tmp');
      writeFileSync(testFile, 'test');
      readFileSync(testFile);
      unlinkSync(testFile);

      return {
        name: 'Read Permissions',
        passed: true,
        message: 'Read permissions OK',
      };
    } catch (error: unknown) {
      return {
        name: 'Read Permissions',
        passed: false,
        message: `Cannot read from upload directory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private checkDiskSpace(): SystemCheck {
    try {
      // This is a simplified check - in production you might want to use a library
      // like 'fs-extra' or 'disk-usage' for more accurate disk space checking
      const testData = Buffer.alloc(1024 * 1024); // 1MB test
      const testFile = join(this.uploadPath, 'space-test.tmp');

      writeFileSync(testFile, testData);
      unlinkSync(testFile);

      return {
        name: 'Disk Space',
        passed: true,
        message: 'Sufficient disk space available',
        warning: 'Disk space check is basic - monitor disk usage in production',
      };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOSPC'
      ) {
        return {
          name: 'Disk Space',
          passed: false,
          message: 'Insufficient disk space',
        };
      }

      return {
        name: 'Disk Space',
        passed: true,
        message: 'Disk space check inconclusive',
        warning: `Could not verify disk space: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async getDirectoryStats(dirPath: string): Promise<DirectoryStats> {
    const stats: DirectoryStats = {
      fileCount: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null,
      extensions: {},
    };

    if (!existsSync(dirPath)) {
      return stats;
    }

    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file.startsWith('.')) continue; // Skip hidden files like .gitkeep

        const filePath = join(dirPath, file);
        const fileStat = await fs.stat(filePath);

        if (fileStat.isFile()) {
          stats.fileCount++;
          stats.totalSize += fileStat.size;

          const extension = file.split('.').pop()?.toLowerCase() || 'unknown';
          stats.extensions[extension] = (stats.extensions[extension] || 0) + 1;

          const fileInfo = {
            name: file,
            date: fileStat.mtime,
            size: fileStat.size,
          };

          if (!stats.oldestFile || fileStat.mtime < stats.oldestFile.date) {
            stats.oldestFile = fileInfo;
          }

          if (!stats.newestFile || fileStat.mtime > stats.newestFile.date) {
            stats.newestFile = fileInfo;
          }
        }
      }
    } catch {
      // Error getting directory stats - return empty stats
    }

    return stats;
  }

  /**
   * Validates a file upload request
   */
  validateUploadRequest(file: Express.Multer.File): UploadValidationResult {
    const result: UploadValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!file) {
      result.valid = false;
      result.errors.push('No file provided');
      return result;
    }

    // Check file size
    if (file.size > 5 * 1024 * 1024) {
      result.valid = false;
      result.errors.push('File size exceeds 5MB limit');
    }

    // Check file type
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      result.valid = false;
      result.errors.push(
        'Invalid file type. Allowed: JPG, JPEG, PNG, WEBP, GIF',
      );
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(`.${extension}`)) {
      result.valid = false;
      result.errors.push('Invalid file extension');
    }

    // Warnings for optimization
    if (file.size > 2 * 1024 * 1024) {
      result.warnings.push('File size is large (>2MB) - consider optimizing');
    }

    return result;
  }
}

// Type definitions
export interface UploadSystemStatus {
  overall: 'healthy' | 'warning' | 'error';
  checks: SystemCheck[];
  errors: string[];
  warnings: string[];
}

export interface SystemCheck {
  name: string;
  passed: boolean;
  message: string;
  warning?: string;
}

export interface UploadFixResult {
  success: boolean;
  actions: string[];
  errors: string[];
}

export interface UploadStats {
  directories: Record<string, DirectoryStats>;
  totalFiles: number;
  totalSize: number;
  oldestFile: FileInfo | null;
  newestFile: FileInfo | null;
}

export interface DirectoryStats {
  fileCount: number;
  totalSize: number;
  oldestFile: FileInfo | null;
  newestFile: FileInfo | null;
  extensions: Record<string, number>;
}

export interface FileInfo {
  name: string;
  date: Date;
  size: number;
}

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
