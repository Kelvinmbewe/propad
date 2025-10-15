import { env } from '@propad/config';

export const authOptions = {
  providers: {
    email: {
      from: env.EMAIL_FROM
    }
  }
};
