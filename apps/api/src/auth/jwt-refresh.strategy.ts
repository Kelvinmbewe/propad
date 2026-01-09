import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '@propad/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // Get from body
            ignoreExpiration: false,
            secretOrKey: env.JWT_SECRET || 'secret', // Ideally separate secret, but simplified for now
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const refreshToken = req.body.refreshToken;
        // In a production system, we would verify this token exists in a whitelist/blacklist in DB
        return {
            userId: payload.sub,
            role: payload.role,
            profileId: payload.profileId,
            agencyId: payload.agencyId,
            refreshToken
        };
    }
}
