import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { listOrders, placeCustomerOrder, listOrdersForAccount } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const placeOrderSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().optional().default(1),
  deliveryAddress: z.string().min(5),
  customerName: z.string().optional()
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ orders: listOrders() });
    }
    if (user.role === 'CUSTOMER' && user.accountId) {
      return Response.json({ orders: listOrdersForAccount(user.accountId) });
    }
    return Response.json({ orders: listOrders() });
  } catch (e) {
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = placeOrderSchema.parse(await req.json());

    const customerId = user?.id || 'USR-CUST-1042';
    const customerName = body.customerName || user?.name || 'Customer';
    const accountId = user?.accountId || 'HH-208';

    const order = placeCustomerOrder({
      customerId,
      customerName,
      accountId,
      productId: body.productId,
      quantity: body.quantity,
      deliveryAddress: body.deliveryAddress
    });

    return Response.json({ success: true, order });
  } catch (e) {
    const isZod = e instanceof z.ZodError;
    return Response.json(
      { error: isZod ? 'Invalid order payload' : e instanceof Error ? e.message : 'Order placement failed' },
      { status: 400 }
    );
  }
}
