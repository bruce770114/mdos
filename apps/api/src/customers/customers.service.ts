import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerContact } from './customer-contact.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(CustomerContact)
    private readonly contactsRepo: Repository<CustomerContact>,
  ) {}

  async create(dto: CreateCustomerDto, tenantId: string): Promise<Customer> {
    const customer = this.customersRepo.create({ ...dto, tenantId });
    return this.customersRepo.save(customer);
  }

  async findAll(
    query: QueryCustomersDto,
    tenantId: string,
  ): Promise<PaginatedResult<Customer>> {
    const { page = 1, pageSize = 20, search, grade, industry } = query;

    const qb = this.customersRepo
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.contacts', 'contacts')
      .where('customer.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(customer.companyName ILIKE :search OR customer.contactName ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (grade) {
      qb.andWhere('customer.grade = :grade', { grade });
    }
    if (industry) {
      qb.andWhere('customer.industry ILIKE :industry', { industry: `%${industry}%` });
    }

    qb.orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return paginate(list, total, page, pageSize);
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.customersRepo.findOne({
      where: { id, tenantId },
      relations: ['contacts'],
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    tenantId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);
    Object.assign(customer, dto);
    return this.customersRepo.save(customer);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    await this.customersRepo.softRemove(customer);
  }

  /**
   * Returns the customer with a stub contracts list.
   * Actual contracts are resolved via ContractsService when the module is available.
   */
  async getCustomerWithContracts(
    id: string,
    tenantId: string,
  ): Promise<{ customer: Customer; contracts: unknown[] }> {
    const customer = await this.findOne(id, tenantId);
    // Contracts will be injected from ContractsModule in a future iteration.
    return { customer, contracts: [] };
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────────

  async addContact(
    customerId: string,
    dto: CreateContactDto,
    tenantId: string,
  ): Promise<CustomerContact> {
    // Validate ownership
    await this.findOne(customerId, tenantId);

    // If new contact is primary, demote existing primary contacts
    if (dto.isPrimary) {
      await this.contactsRepo.update({ customerId, isPrimary: true }, { isPrimary: false });
    }

    const contact = this.contactsRepo.create({ ...dto, customerId });
    return this.contactsRepo.save(contact);
  }

  async updateContact(
    customerId: string,
    contactId: string,
    dto: UpdateContactDto,
    tenantId: string,
  ): Promise<CustomerContact> {
    await this.findOne(customerId, tenantId);

    const contact = await this.contactsRepo.findOne({
      where: { id: contactId, customerId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    // If promoting to primary, demote others first
    if (dto.isPrimary && !contact.isPrimary) {
      await this.contactsRepo.update({ customerId, isPrimary: true }, { isPrimary: false });
    }

    Object.assign(contact, dto);
    return this.contactsRepo.save(contact);
  }

  async removeContact(
    customerId: string,
    contactId: string,
    tenantId: string,
  ): Promise<void> {
    await this.findOne(customerId, tenantId);

    const contact = await this.contactsRepo.findOne({
      where: { id: contactId, customerId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    await this.contactsRepo.softRemove(contact);
  }
}
