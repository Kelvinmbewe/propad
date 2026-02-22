import { Controller, Post, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReconciliationController {
    constructor(private readonly reconciliationService: ReconciliationService) { }

    @Post('wallets')
    async reconcileWallets() {
        return this.reconciliationService.reconcileWallets();
    }
}
