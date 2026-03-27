import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Bill } from './bill.entity';

export type BillItemType = 'rent' | 'property_fee' | 'utility' | 'other';

@Entity('bill_items')
export class BillItem extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  billId: string;

  @Column({
    type: 'enum',
    enum: ['rent', 'property_fee', 'utility', 'other'],
  })
  itemType: BillItemType;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @ManyToOne(() => Bill, (bill) => bill.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'billId' })
  bill: Bill;
}
