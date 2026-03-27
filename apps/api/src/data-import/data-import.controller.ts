import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { DataImportService } from './data-import.service';

@ApiTags('data-import')
@ApiBearerAuth()
@Controller('data')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '批量导入数据（Excel .xlsx）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async importData(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('请上传 Excel 文件');
    }
    return this.dataImportService.importFromBuffer(file.buffer, req.user.tenantId);
  }

  @Get('import-template')
  @ApiOperation({ summary: '下载导入模板' })
  getTemplate(@Res() res: Response) {
    const buffer = this.dataImportService.getImportTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="import-template.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export')
  @ApiOperation({ summary: '导出全量数据到 Excel' })
  async exportData(@Request() req: any, @Res() res: Response) {
    const buffer = await this.dataImportService.exportToBuffer(req.user.tenantId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mdos-export-${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
