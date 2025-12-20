import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const flattened = result.error.flatten();
      // DIAGNOSTIC: Return full validation error details
      const errorDetails: any = {
        message: 'Property creation validation failed',
        issues: result.error.errors.map(err => ({
          path: err.path.join('.') || 'root',
          message: err.message,
          code: err.code,
          received: err.path.length > 0 ? (value as any)?.[err.path[0]] : undefined
        })),
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
        // Include raw Zod error for full diagnostic context
        _zodError: {
          issues: result.error.issues,
          name: result.error.name
        }
      };
      throw new BadRequestException(errorDetails);
    }

    return result.data;
  }
}
