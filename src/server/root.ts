import { router } from './trpc'
import { productsRouter } from './routers/products'
import { ordersRouter } from './routers/orders'

export const appRouter = router({
  products: productsRouter,
  orders: ordersRouter,
})

export type AppRouter = typeof appRouter
