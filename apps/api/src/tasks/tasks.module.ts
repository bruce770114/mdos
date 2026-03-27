import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Contract } from '../contracts/contract.entity';
import { Receivable } from '../billing/receivable.entity';
import { Notification } from '../notifications/notification.entity';
import { Tenant } from '../tenants/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, Receivable, Notification, Tenant]),
  ],
  providers: [TasksService],
})
export class TasksModule {}
