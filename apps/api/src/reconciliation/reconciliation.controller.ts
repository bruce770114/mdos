import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { ManualMatchDto } from './dto/manual-match.dto';
import { memoryStorage } from 'multer';

@ApiTags('reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import bank statements from CSV/Excel file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importStatements(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.reconciliationService.importStatements(file.buffer, req.user.tenantId);
  }

  @Get('statements')
  @ApiOperation({ summary: 'List bank statements with pagination' })
  getStatements(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('matchStatus') matchStatus: string,
    @Request() req: any,
  ) {
    return this.reconciliationService.getStatements(
      req.user.tenantId,
      parseInt(page ?? '1', 10),
      parseInt(pageSize ?? '20', 10),
      matchStatus,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get reconciliation summary statistics' })
  getSummary(@Request() req: any) {
    return this.reconciliationService.getSummary(req.user.tenantId);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Auto-match unmatched statements against receivables' })
  autoMatch(@Request() req: any) {
    return this.reconciliationService.autoMatch(req.user.tenantId);
  }

  @Post('statements/:id/match')
  @ApiOperation({ summary: 'Manually match a statement to a receivable' })
  manualMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualMatchDto,
    @Request() req: any,
  ) {
    return this.reconciliationService.manualMatch(id, dto.receivableId, req.user.tenantId);
  }

  @Post('statements/:id/unmatch')
  @ApiOperation({ summary: 'Remove match from a statement' })
  unmatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.reconciliationService.unmatch(id, req.user.tenantId);
  }
}
