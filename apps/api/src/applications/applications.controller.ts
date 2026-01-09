import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    apply(@Req() req: AuthenticatedRequest, @Body() dto: CreateApplicationDto) {
        return this.applicationsService.apply(req.user.userId, dto);
    }

    @Get('my')
    findMyApplications(@Req() req: AuthenticatedRequest) {
        return this.applicationsService.findMyApplications(req.user.userId);
    }

    @Get('received')
    findReceivedApplications(@Req() req: AuthenticatedRequest) {
        return this.applicationsService.findReceivedApplications(req.user.userId);
    }

    @Get('property/:propertyId')
    findByProperty(@Param('propertyId') propertyId: string, @Req() req: AuthenticatedRequest) {
        return this.applicationsService.findByProperty(propertyId, req.user);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateApplicationStatusDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.applicationsService.updateStatus(id, dto, req.user);
    }
}
