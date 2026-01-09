import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';
import { Currency } from '@prisma/client';
import { Role } from '@propad/config';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly ledger: WalletLedgerService) { }

  @Get('me')
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD)
  async getMyWallet(@Req() req: AuthenticatedRequest) {
    const balance = await this.ledger.calculateBalance(req.user.userId, Currency.USD);

    return {
      balanceCents: balance.balanceCents,
      pendingCents: balance.pendingCents,
      withdrawableCents: balance.withdrawableCents,
      currency: Currency.USD
    };
  }
}

