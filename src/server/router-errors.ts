import { TRPCError } from '@trpc/server';

export function rethrowUniqueConflict(error: unknown, message: string): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    throw new TRPCError({ code: 'CONFLICT', message });
  }
  throw error;
}
