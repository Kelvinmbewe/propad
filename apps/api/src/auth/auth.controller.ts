import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginDto = z.infer<typeof schema>;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }
    return this.authService.login(result.data.email, result.data.password);
  }
}
