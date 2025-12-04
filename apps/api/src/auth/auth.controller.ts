import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = schema.extend({
  name: z.string().optional()
});

type LoginDto = z.infer<typeof schema>;
type RegisterDto = z.infer<typeof registerSchema>;

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }
    return this.authService.login(result.data.email, result.data.password);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }
    return this.authService.register(result.data.email, result.data.password, result.data.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  session(@Req() req: AuthenticatedRequest) {
    return this.authService.getSession(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  refresh(@Req() req: AuthenticatedRequest) {
    return this.authService.refresh(req.user.userId);
  }
}
