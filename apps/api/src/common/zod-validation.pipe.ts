import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const flattened = result.error.flatten();
      // Include both fieldErrors and formErrors for better error messages
      const errorDetails = {
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
        message: 'Validation failed',
        details: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
      throw new BadRequestException(errorDetails);
    }

    return result.data;
  }
}
