import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { CustomersController, NotesController, OptionsController } from './customers.controller';
import { ExpensesController } from './expenses.controller';
import { FilesController } from './files.controller';
import { NotesService } from './notes.service';
import { PaymentsController } from './payments.controller';
import { ProfileController } from './profile.controller';
import { RequestsController } from './requests.controller';

// Staff core: customers, requests, bookings (+documents), payments, expenses, profile.
@Module({
  controllers: [
    CustomersController, OptionsController, NotesController, RequestsController, BookingsController,
    PaymentsController, ExpensesController, FilesController, ProfileController,
  ],
  providers: [NotesService],
})
export class CoreModule {}
