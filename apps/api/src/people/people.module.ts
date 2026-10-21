import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { EmployeesController } from './employees.controller';

// People: my attendance (clock in/out), employee management, attendance monitoring and monthly reports.
@Module({ controllers: [AttendanceController, EmployeesController] })
export class PeopleModule {}
