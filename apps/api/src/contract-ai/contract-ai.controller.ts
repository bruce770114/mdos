import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ContractAiService, ParsedContractResult } from './contract-ai.service';
import { memoryStorage } from 'multer';

@ApiTags('contract-ai')
@ApiBearerAuth()
@Controller('contract-ai')
export class ContractAiController {
  constructor(private readonly contractAiService: ContractAiService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse contract file with AI and extract key fields' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  async parseContract(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ParsedContractResult> {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.contractAiService.parseContractFile(file.buffer, file.mimetype, req.user.tenantId);
  }

  @Post('apply/:contractId')
  @ApiOperation({ summary: 'Apply parsed AI result to a contract draft' })
  async applyToContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() data: ParsedContractResult,
    @Request() req: any,
  ) {
    return this.contractAiService.applyToContract(contractId, data, req.user.tenantId);
  }
}
