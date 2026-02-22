import { Controller, Get, Query, Param, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WalletLedgerService } from './wallet-ledger.service';
import { Role } from '@propad/config';
import { Prisma } from '@prisma/client';

@Controller('admin/ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLedgerController {
    constructor(private readonly ledger: WalletLedgerService) { }

    @Get()
    async search(
        @Query('userId') userId?: string,
        @Query('type') type?: string,
        @Query('sourceType') sourceType?: string,
        @Query('sourceId') sourceId?: string,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
        @Query('cursor') cursor?: string
    ) {
        // We might need to expose a search method in WalletLedgerService or use Prisma directly
        // For now, let's use a basic search via Prisma (or add method to Service)
        // Ideally we add search to service.
        return this.ledger.search({
            userId,
            type: type as any,
            sourceType: sourceType as any,
            sourceId,
            limit,
            cursor
        });
    }

    @Get(':id')
    async getEntry(@Param('id') id: string) {
        // Implement get by ID
        return this.ledger.getEntry(id);
    }
}
