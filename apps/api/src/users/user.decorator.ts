import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!data) {
      return user;
    }

    const direct = user?.[data];
    if (direct !== undefined && direct !== null) {
      return direct;
    }

    if (data === "id") {
      return user?.id ?? user?.userId ?? user?.sub ?? user?.profileId ?? null;
    }

    return null;
  },
);
