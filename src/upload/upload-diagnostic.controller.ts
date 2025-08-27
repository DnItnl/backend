import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UploadCheckUtil } from './upload-check.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('upload/diagnostics')
export class UploadDiagnosticController {
  constructor(private readonly uploadCheckUtil: UploadCheckUtil) {}

  @Get('health')
  getSystemHealth() {
    try {
      const status = this.uploadCheckUtil.performSystemCheck();

      return {
        status: status.overall,
        timestamp: new Date().toISOString(),
        checks: status.checks,
        errors: status.errors,
        warnings: status.warnings,
        summary: {
          totalChecks: status.checks.length,
          passed: status.checks.filter((check) => check.passed).length,
          failed: status.checks.filter((check) => !check.passed).length,
        },
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Health check failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getUploadStats() {
    try {
      const stats = await this.uploadCheckUtil.getUploadStats();

      return {
        status: 'success',
        timestamp: new Date().toISOString(),
        stats: {
          ...stats,
          totalSizeFormatted: this.formatBytes(stats.totalSize),
          directories: Object.keys(stats.directories).reduce((acc, key) => {
            acc[key] = {
              ...stats.directories[key],
              totalSizeFormatted: this.formatBytes(
                stats.directories[key].totalSize,
              ),
              averageFileSize:
                stats.directories[key].fileCount > 0
                  ? Math.round(
                      stats.directories[key].totalSize /
                        stats.directories[key].fileCount,
                    )
                  : 0,
              averageFileSizeFormatted:
                stats.directories[key].fileCount > 0
                  ? this.formatBytes(
                      Math.round(
                        stats.directories[key].totalSize /
                          stats.directories[key].fileCount,
                      ),
                    )
                  : '0 B',
            };
            return acc;
          }, {}),
        },
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve upload statistics',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('auto-fix')
  autoFixIssues() {
    try {
      const fixResult = this.uploadCheckUtil.autoFix();

      return {
        status: fixResult.success ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        result: fixResult,
        message: fixResult.success
          ? 'Auto-fix completed successfully'
          : 'Auto-fix completed with errors',
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Auto-fix failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('config')
  getUploadConfig() {
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      config: {
        maxFileSize: '5MB',
        allowedFormats: ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'],
        uploadPath: './uploads/',
        directories: ['sets', 'characters'],
        staticPrefix: '/uploads/',
        authenticationRequired: true,
        features: {
          imageValidation: true,
          uuidFilenames: true,
          directoryAutoCreation: true,
          staticServing: true,
        },
        endpoints: {
          uploadSetCover: 'POST /uploads/sets/cover',
          uploadCharacterImage: 'POST /uploads/characters/image',
          uploadCharacterWithName: 'POST /characters/upload-image',
          updateCharacterImage: 'PATCH /characters/:id/image',
          getSetCover: 'GET /uploads/sets/:filename',
          getCharacterImage: 'GET /uploads/characters/:filename',
          systemHealth: 'GET /upload/diagnostics/health',
          systemStats: 'GET /upload/diagnostics/stats',
          autoFix: 'POST /upload/diagnostics/auto-fix',
          config: 'GET /upload/diagnostics/config',
        },
      },
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
