import { router, publicProcedure, adminProcedure } from '../trpc'
import { z } from 'zod'

export const productsRouter = router({
  getAll: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().min(1).max(50).default(12),
      cursor: z.string().optional(),
    }))
    .query(async ({ input }) => {
      // Productos vienen de Sanity CMS
      return { products: [], nextCursor: null }
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return { product: null }
    }),
})
