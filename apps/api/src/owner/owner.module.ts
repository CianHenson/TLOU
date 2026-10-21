import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { DashboardController } from './dashboard.controller';
import { FinanceController } from './finance.controller';
import { ServicesController } from './services.controller';
import { SettingsController } from './settings.controller';

// Owner/system: dashboards, financial reports, service management, website content, audit logs, settings, messages.
@Module({ controllers: [DashboardController, FinanceController, ServicesController, SettingsController, AuditController] })
export class OwnerModule {}
