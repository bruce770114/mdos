import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ─── Customers ───────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  create(@Body() dto: CreateCustomerDto, @Request() req: any) {
    return this.customersService.create(dto, req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List customers with search and pagination' })
  findAll(@Query() query: QueryCustomersDto, @Request() req: any) {
    return this.customersService.findAll(query, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.customersService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @Request() req: any,
  ) {
    return this.customersService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a customer' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.customersService.remove(id, req.user.tenantId);
  }

  @Get(':id/contracts')
  @ApiOperation({ summary: "List customer's contracts (stub)" })
  getContracts(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.customersService.getCustomerWithContracts(id, req.user.tenantId);
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────────

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add a contact to a customer' })
  addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
    @Request() req: any,
  ) {
    return this.customersService.addContact(id, dto, req.user.tenantId);
  }

  @Put(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Update a contact' })
  updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
    @Request() req: any,
  ) {
    return this.customersService.updateContact(id, contactId, dto, req.user.tenantId);
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a contact' })
  removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Request() req: any,
  ) {
    return this.customersService.removeContact(id, contactId, req.user.tenantId);
  }
}
