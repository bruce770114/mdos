import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type OrderType = 'new' | 'renewal' | 'upgrade' | 'downgrade' | 'gift';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';
export type PaymentMethod = 'wechat' | 'alipay' | 'bank_transfer' | 'platform_gift' | 'none';
export type InvoiceStatus = 'not_applied' | 'applied' | 'issued';

@Entity('subscription_orders')
export class SubscriptionOrder extends BaseEntity {
  @Column({ name: 'order_id', length: 100, unique: true })
  orderId: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  @Index()
  tenantId: string;

  @Column({ name: 'plan_id', type: 'varchar' })
  planId: string;

  @Column({
    name: 'order_type',
    type: 'enum',
    enum: ['new', 'renewal', 'upgrade', 'downgrade', 'gift'],
    default: 'new',
  })
  orderType: OrderType;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: ['monthly', 'yearly'],
    default: 'yearly',
  })
  billingCycle: BillingCycle;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo: Date | null;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['pending', 'paid', 'refunded', 'cancelled'],
    default: 'pending',
  })
  paymentStatus: PaymentStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['wechat', 'alipay', 'bank_transfer', 'platform_gift', 'none'],
    default: 'none',
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({
    name: 'invoice_status',
    type: 'enum',
    enum: ['not_applied', 'applied', 'issued'],
    default: 'not_applied',
  })
  invoiceStatus: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;
}
