import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './jwt-refresh.guard';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = schema.extend({
  name: z.string().optional(),
  referralCode: z.string().optional()
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
    // TEMP LOG: for debugging (remove later)
    console.log('LOGIN ATTEMPT:', body.email);

    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }
    return this.authService.login(result.data.email, result.data.password);
  }

  // TEMP ENDPOINT: for curl testing independent of NextAuth (remove later)
  @Post('login-test')
  async loginTest(@Body() body: LoginDto) {
    console.log('LOGIN-TEST ATTEMPT (no guards):', body.email);

    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }

    try {
      const loginResult = await this.authService.login(result.data.email, result.data.password);
      console.log('LOGIN-TEST SUCCESS:', result.data.email);
      return loginResult;
    } catch (error) {
      console.log('LOGIN-TEST FAILED:', result.data.email, error);
      throw error;
    }
  }

  @Post('register')
  async register(@Req() req: any, @Body() body: RegisterDto) {
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    return this.authService.register(
      result.data.email,
      result.data.password,
      result.data.name,
      result.data.referralCode,
      { ip }
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  session(@Req() req: AuthenticatedRequest) {
    return this.authService.getSession(req.user.userId);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: AuthenticatedRequest) {
    return this.authService.refresh(req.user.userId);
  }

  @Post('mobile/login')
  async mobileLogin(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }
}
