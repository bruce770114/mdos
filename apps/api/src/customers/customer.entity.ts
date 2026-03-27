import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { CustomerContact } from './customer-contact.entity';

export type CustomerGrade = 'A' | 'B' | 'C';

@Entity('customers')
export class Customer extends BaseEntity {
  @Index()
  @Column()
  tenantId: string;

  @Column()
  companyName: string;

  @Column({ nullable: true, type: 'varchar' })
  creditCode: string | null;

  @Column({ nullable: true, type: 'varchar' })
  legalPerson: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
  registeredCapital: number | null;

  @Column()
  contactName: string;

  @Column()
  phone: string;

  @Column({ nullable: true, type: 'varchar' })
  email: string | null;

  @Column({ nullable: true, type: 'varchar' })
  address: string | null;

  @Column({ nullable: true, type: 'varchar' })
  industry: string | null;

  @Column({ nullable: true, type: 'varchar' })
  grade: CustomerGrade | null;

  @Column({ nullable: true, type: 'simple-array' })
  tags: string[] | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @OneToMany(() => CustomerContact, (contact) => contact.customer, {
    cascade: true,
  })
  contacts: CustomerContact[];
}
