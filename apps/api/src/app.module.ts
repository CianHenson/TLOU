import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { DataModule } from './data/data.module';
import { OwnerModule } from './owner/owner.module';
import { PeopleModule } from './people/people.module';
import { PublicController } from './public/public.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DataModule, AuthModule, CoreModule, PeopleModule, OwnerModule,
  ],
  controllers: [PublicController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
