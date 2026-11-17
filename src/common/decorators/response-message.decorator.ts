import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Set a custom success message for a route.
 * If not set, defaults to 'Success'.
 *
 * @example
 * @ResponseMessage('User created successfully')
 * @Post()
 * create() { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
