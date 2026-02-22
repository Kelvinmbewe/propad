import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { FinanceReportService } from './finance-report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';
import { Response } from 'express';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.FINANCE) // Assume FINANCE role exists or just ADMIN for now
export class AdminReportsController {
    constructor(private readonly financeService: FinanceReportService) { }

    @Get('ledger')
    async getLedger(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('format') format: 'json' | 'csv' = 'json',
        @Res() res: Response
    ) {
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();

        const data = await this.financeService.getLedgerSummary({ startDate: start, endDate: end });

        if (format === 'csv') {
            const csv = this.financeService.toCSV(data.map(d => ({
                date: d.date,
                credits: d.credits / 100,
                debits: d.debits / 100,
                netChange: d.netChange / 100
            })));
            res.header('Content-Type', 'text/csv');
            res.attachment(`ledger-${start.toISOString()}-${end.toISOString()}.csv`);
            return res.send(csv);
        }

        return res.json(data);
    }

    @Get('revenue')
    async getRevenue(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();
        return this.financeService.getRevenueReport({ startDate: start, endDate: end });
    }

    @Get('liabilities')
    async getLiabilities() {
        return this.financeService.getLiabilitiesSnapshot();
    }

    @Get('integrity')
    async checkIntegrity() {
        return this.financeService.checkIntegrity();
    }
}
