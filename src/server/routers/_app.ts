/**
 * This file contains the root router of your tRPC-backend
 */
import { createCallerFactory, publicProcedure, router } from '../trpc';
import { postRouter } from './post';
import { authRouter } from './auth';
import { userRouter } from './user';
import { roleRouter } from './role';
import { permissionRouter } from './permission';
import { regionRouter } from './region';
import { announcementRouter } from './announcement';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),

  auth: authRouter,
  user: userRouter,
  role: roleRouter,
  permission: permissionRouter,
  region: regionRouter,
  announcement: announcementRouter,
  post: postRouter,
});

export const createCaller = createCallerFactory(appRouter);

export type AppRouter = typeof appRouter;
