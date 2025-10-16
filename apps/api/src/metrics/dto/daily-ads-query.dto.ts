import { z } from 'zod';
import { differenceInCalendarDays, formatISO, isValid, parseISO, startOfDay } from 'date-fns';

export const dailyAdsQuerySchema = z
  .object({
    from: z.string(),
    to: z.string().optional()
  })
  .superRefine((value, ctx) => {
    const fromDate = parseISO(value.from);
    if (!isValid(fromDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'Invalid start date' });
      return;
    }
    const toValue = value.to ?? value.from;
    const toDate = parseISO(toValue);
    if (!isValid(toDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Invalid end date' });
      return;
    }
    if (fromDate > toDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: '`from` must be before `to`' });
      return;
    }
    if (differenceInCalendarDays(toDate, fromDate) > 180) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Date range cannot exceed 180 days' });
    }
  })
  .transform((value) => {
    const fromDate = startOfDay(parseISO(value.from));
    const toDate = startOfDay(parseISO(value.to ?? value.from));
    return {
      from: formatISO(fromDate, { representation: 'date' }),
      to: formatISO(toDate, { representation: 'date' })
    };
  });

export type DailyAdsQueryDto = z.infer<typeof dailyAdsQuerySchema>;
