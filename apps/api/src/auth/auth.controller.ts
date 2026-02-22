import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./jwt-refresh.guard";
import { Role } from "@propad/config";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = baseSchema.extend({
  otp: z.string().optional(),
});

const registerSchema = baseSchema.extend({
  name: z.string().optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  companyName: z.string().optional(),
  referralCode: z.string().optional(),
});

const mfaSchema = z.object({
  token: z.string().min(6).max(8),
});

const mfaDisableSchema = z
  .object({
    token: z.string().min(6).max(12).optional(),
    recoveryCode: z.string().min(6).max(20).optional(),
  })
  .refine((data) => data.token || data.recoveryCode, {
    message: "Token or recovery code required",
  });

type LoginDto = z.infer<typeof loginSchema>;
type RegisterDto = z.infer<typeof registerSchema>;

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  async login(@Body() body: LoginDto) {
    // TEMP LOG: for debugging (remove later)
    console.log("LOGIN ATTEMPT:", body.email);

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }
    return this.authService.login(
      result.data.email,
      result.data.password,
      result.data.otp,
    );
  }

  // TEMP ENDPOINT: for curl testing independent of NextAuth (remove later)
  @Post("login-test")
  async loginTest(@Body() body: LoginDto) {
    console.log("LOGIN-TEST ATTEMPT (no guards):", body.email);

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }

    try {
      const loginResult = await this.authService.login(
        result.data.email,
        result.data.password,
        result.data.otp,
      );
      console.log("LOGIN-TEST SUCCESS:", result.data.email);
      return loginResult;
    } catch (error) {
      console.log("LOGIN-TEST FAILED:", result.data.email, error);
      throw error;
    }
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("register")
  async register(@Req() req: any, @Body() body: RegisterDto) {
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }

    const ip =
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    return this.authService.register(
      result.data.email,
      result.data.password,
      result.data.name,
      result.data.phone,
      result.data.role,
      result.data.companyName,
      result.data.referralCode,
      { ip },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("session")
  session(@Req() req: AuthenticatedRequest) {
    return this.authService.getSession(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/setup")
  setupMfa(@Req() req: AuthenticatedRequest) {
    return this.authService.setupMfa(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/verify")
  verifyMfa(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(mfaSchema)) body: { token: string },
  ) {
    return this.authService.verifyMfa(req.user.userId, body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/recovery-codes")
  recoveryCodes(@Req() req: AuthenticatedRequest) {
    return this.authService.generateRecoveryCodes(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/disable")
  disableMfa(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(mfaDisableSchema))
    body: {
      token?: string;
      recoveryCode?: string;
    },
  ) {
    return this.authService.disableMfa(
      req.user.userId,
      body.token ?? body.recoveryCode ?? "",
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  refresh(@Req() req: AuthenticatedRequest) {
    return this.authService.refresh(req.user.userId);
  }

  @Post("mobile/login")
  async mobileLogin(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password, body.otp);
  }
}
