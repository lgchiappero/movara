import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ZodError } from 'zod'

export const createTRPCContext = async () => {
  const session = await auth()
  return { session, db }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: { ...ctx, session: ctx.session },
  })
})

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({
    ctx: { ...ctx, session: ctx.session },
  })
})
