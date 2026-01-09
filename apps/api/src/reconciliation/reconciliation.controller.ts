import { Controller, Post, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
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
