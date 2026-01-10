import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@propad/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PromosService } from './promos.service';
import { CreatePromoDto, createPromoSchema } from './dto/create-promo.dto';
import { PromoRebateDto, promoRebateSchema } from './dto/promo-rebate.dto';

@Controller('promos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) { }

  @Roles(Role.AGENT, Role.ADMIN)
  @Post()
  create(@Body(new ZodValidationPipe(createPromoSchema)) dto: CreatePromoDto) {
    return this.promosService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.promosService.activate(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/rebate')
  rebate(@Param('id') id: string, @Body(new ZodValidationPipe(promoRebateSchema)) dto: PromoRebateDto) {
    return this.promosService.logRebate(id, dto);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('suburb-sorting')
  suburbSorting() {
    return this.promosService.suburbSortingEffect();
  }
}
