import { router, protectedProcedure, adminProcedure } from '../trpc'
import { z } from 'zod'

export const ordersRouter = router({
  create: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.string(),
        name: z.string(),
        price: z.number(),
        quantity: z.number().min(1),
        image: z.string().optional(),
      })),
      paymentMethod: z.enum(['mercadopago', 'transfer']),
      address: z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        phone: z.string(),
        street: z.string(),
        city: z.string(),
        province: z.string(),
        zip: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user?.id
      if (!userId) throw new Error('User ID not found')

      const total = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
      )

      const order = await ctx.db.order.create({
        data: {
          userId,
          paymentMethod: input.paymentMethod,
          total,
          address: input.address,
          items: {
            create: input.items.map(item => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image ?? null,
            })),
          },
        },
      })
      return { orderId: order.id }
    }),

  getMyOrders: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user?.id
      if (!userId) throw new Error('User ID not found')

      return ctx.db.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
    }),

  getAll: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.db.order.findMany({
        include: { items: true, user: true },
        orderBy: { createdAt: 'desc' },
      })
    }),

  updateStatus: adminProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.order.update({
        where: { id: input.orderId },
        data: { status: input.status },
      })
    }),
})
