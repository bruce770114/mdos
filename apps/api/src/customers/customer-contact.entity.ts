import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Customer } from './customer.entity';

@Entity('customer_contacts')
export class CustomerContact extends BaseEntity {
  @Column()
  customerId: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true, type: 'varchar' })
  email: string | null;

  @Column({ nullable: true, type: 'varchar' })
  position: string | null;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @ManyToOne(() => Customer, (customer) => customer.contacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;
}
