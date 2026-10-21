import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

const secret = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET not set - using an insecure development secret.');

@Global()
@Module({
  imports: [JwtModule.register({ secret, signOptions: { expiresIn: '8h' } })],
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
