import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IncentivesManifestService } from './incentives-manifest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@ApiTags('Admin Manifest')
@ApiBearerAuth()
@Controller('admin/incentives/manifest')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.FINANCE)
export class ManifestController {
    constructor(private readonly manifestService: IncentivesManifestService) { }

    @Get()
    @ApiOperation({ summary: 'Get current incentives manifest' })
    async getCurrentManifest() {
        return this.manifestService.generateManifest();
    }

    @Post('snapshot')
    @ApiOperation({ summary: 'Create a manifest snapshot for audit' })
    async createSnapshot(@Request() req: any) {
        return this.manifestService.saveManifestSnapshot(req.user?.id);
    }

    @Get('history')
    @ApiOperation({ summary: 'Get manifest version history' })
    async getHistory() {
        return this.manifestService.getManifestHistory();
    }

    @Get(':version')
    @ApiOperation({ summary: 'Get specific manifest version' })
    async getVersion(@Param('version') version: string) {
        return this.manifestService.getManifestVersion(parseInt(version, 10));
    }
}
