import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { Role } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GeoService } from './geo.service';
import { CreatePendingGeoDto } from './dto/create-pending-geo.dto';
import { ListPendingGeoDto, listPendingGeoSchema } from './dto/list-pending-geo.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) { }

  @Get('countries')
  listCountries() {
    return this.geoService.listCountries();
  }

  @Get('provinces')
  listProvinces(@Query('countryId') countryId?: string) {
    if (!countryId) {
      throw new BadRequestException('countryId is required');
    }
    return this.geoService.listProvinces(countryId);
  }

  @Get('cities')
  listCities(@Query('provinceId') provinceId?: string) {
    if (!provinceId) {
      throw new BadRequestException('provinceId is required');
    }
    return this.geoService.listCities(provinceId);
  }

  @Get('suburbs')
  listSuburbs(@Query('cityId') cityId?: string) {
    if (!cityId) {
      throw new BadRequestException('cityId is required');
    }
    return this.geoService.listSuburbs(cityId);
  }

  @Get('search')
  search(@Query('q') q?: string) {
    return this.geoService.search(q ?? '');
  }

  @Post('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
  createPending(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePendingGeoDto
  ) {
    return this.geoService.createPending(dto.level, dto.proposedName, req.user.userId, dto.parentId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listPending(@Query(new ZodValidationPipe(listPendingGeoSchema)) query: ListPendingGeoDto) {
    return this.geoService.listPending(query);
  }

  @Post('pending/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approvePending(@Param('id') id: string) {
    return this.geoService.approvePending(id);
  }

  @Post('pending/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  rejectPending(@Param('id') id: string) {
    return this.geoService.rejectPending(id);
  }

  @Post('pending/:id/merge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  mergePending(@Param('id') id: string, @Body('targetId') targetId?: string) {
    if (!targetId) {
      throw new BadRequestException('targetId is required to merge');
    }
    return this.geoService.mergePending(id, targetId);
  }
}
