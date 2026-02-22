import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { RiskService } from '../security/risk.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { env } from '@propad/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: '15m' }
    }),
    PrismaModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy,
    JwtRefreshStrategy,
    RiskService
  ],
  exports: [AuthService, JwtModule]
})
export class AuthModule { }
