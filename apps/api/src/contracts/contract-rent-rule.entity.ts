import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Contract } from './contract.entity';

@Entity('contract_rent_rules')
export class ContractRentRule extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  contractId: string;

  @Column({ type: 'varchar' })
  ruleType: string;

  @Column({ type: 'jsonb' })
  params: Record<string, unknown>;

  @Column({ type: 'date' })
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date | null;

  @ManyToOne(() => Contract, (contract) => contract.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;
}
