/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe for SaaS billing management.
 * This endpoint must be registered WITHOUT body parsing middleware so we can
 * validate the raw body signature.
 */

import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { prisma } from '@pos/db';

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_your') || key === 'sk_test_') return null;
  return new Stripe(key, { apiVersion: '2023-10-16' as any });
}

function mapStripePlanTier(priceId: string): string {
  // Map Stripe price IDs to plan tiers
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_BASIC || '']: 'BASIC',
    [process.env.STRIPE_PRICE_ADVANCED || '']: 'ADVANCED',
    [process.env.STRIPE_PRICE_PRO || '']: 'PRO',
  };
  return priceMap[priceId] || 'ADVANCED';
}

export default async function stripeWebhookRoutes(app: FastifyInstance) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    app.log.warn('Stripe not configured - webhook handler disabled');
    return;
  }

  // Raw body parser for webhook signature validation
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.post('/stripe/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;

    if (!sig) {
      return reply.code(400).send({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(request.body as Buffer, sig, webhookSecret);
    } catch (err: any) {
      app.log.warn({ err: err.message }, 'Stripe webhook signature verification failed');
      return reply.code(400).send({ error: `Webhook signature invalid: ${err.message}` });
    }

    app.log.info({ type: event.type, id: event.id }, 'Stripe webhook received');

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCancelled(subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSucceeded(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session, stripe);
          break;
        }

        default:
          app.log.debug({ type: event.type }, 'Unhandled Stripe webhook event type');
      }
    } catch (err: any) {
      app.log.error({ err: err.message, eventType: event.type }, 'Error processing Stripe webhook');
      // Return 200 to prevent Stripe retrying - log error internally
      return reply.code(200).send({ received: true, error: 'Processing error logged' });
    }

    return reply.code(200).send({ received: true });
  });

  // Create Stripe checkout session for a restaurant
  app.post('/stripe/create-checkout', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Only restaurant owners can manage billing' });
    }

    const { priceId, successUrl, cancelUrl } = request.body as {
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!priceId || !successUrl || !cancelUrl) {
      return reply.code(400).send({ success: false, error: 'priceId, successUrl, and cancelUrl are required' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });

    if (!restaurant) {
      return reply.code(404).send({ success: false, error: 'Restaurant not found' });
    }

    const ownerEmail = restaurant.users[0]?.email || restaurant.email || undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: ownerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
      },
      subscription_data: {
        metadata: {
          restaurantId: restaurant.id,
        },
      },
    });

    return reply.send({ success: true, data: { url: session.url, sessionId: session.id } });
  });

  // Create billing portal session for managing subscription
  app.post('/stripe/billing-portal', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const user = (request as any).user;
    if (!['OWNER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Only restaurant owners can manage billing' });
    }

    const { returnUrl } = request.body as { returnUrl: string };

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { settings: true },
    });

    const stripeCustomerId = (restaurant?.settings as any)?.saas?.stripeCustomerId;
    if (!stripeCustomerId) {
      return reply.code(400).send({
        success: false,
        error: 'No billing account found. Please complete a subscription first.',
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return reply.send({ success: true, data: { url: portalSession.url } });
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const restaurantId = subscription.metadata?.restaurantId;
  if (!restaurantId) return;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, settings: true },
  });
  if (!restaurant) return;

  const priceId = subscription.items.data[0]?.price.id || '';
  const tier = mapStripePlanTier(priceId);
  const status = subscription.status;

  const billingStatus =
    status === 'active' ? 'active' :
    status === 'trialing' ? 'trialing' :
    status === 'past_due' ? 'past_due' :
    status === 'canceled' ? 'cancelled' :
    status === 'unpaid' ? 'past_due' :
    'active';

  const settings = restaurant.settings as any;
  const updatedSettings = {
    ...settings,
    demoMode: false,
    saas: {
      ...(settings?.saas || {}),
      tier,
      billingStatus,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionStatus: status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
    },
  };

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      settings: updatedSettings,
      isActive: ['active', 'trialing'].includes(billingStatus),
    },
  });
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const restaurantId = subscription.metadata?.restaurantId;
  if (!restaurantId) return;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, settings: true },
  });
  if (!restaurant) return;

  const settings = restaurant.settings as any;
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      settings: {
        ...settings,
        saas: {
          ...(settings?.saas || {}),
          billingStatus: 'cancelled',
          stripeSubscriptionId: subscription.id,
          cancelledAt: new Date().toISOString(),
        },
      },
    },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // The subscription.updated event will handle status changes
  // This is just for logging / receipt generation if needed
  const restaurantId = (invoice.metadata as any)?.restaurantId
    || (invoice.subscription_details?.metadata as any)?.restaurantId;

  if (restaurantId) {
    await prisma.auditLog.create({
      data: {
        restaurantId,
        action: 'STRIPE_PAYMENT_SUCCEEDED',
        entityType: 'PAYMENT',
        entityId: invoice.id,
        details: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          periodStart: invoice.period_start,
          periodEnd: invoice.period_end,
        },
      },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const restaurantId = (invoice.metadata as any)?.restaurantId
    || (invoice.subscription_details?.metadata as any)?.restaurantId;

  if (!restaurantId) return;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, settings: true },
  });
  if (!restaurant) return;

  const settings = restaurant.settings as any;
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      settings: {
        ...settings,
        saas: {
          ...(settings?.saas || {}),
          billingStatus: 'past_due',
          lastPaymentFailedAt: new Date().toISOString(),
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      restaurantId,
      action: 'STRIPE_PAYMENT_FAILED',
      entityType: 'PAYMENT',
      entityId: invoice.id,
      details: {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
        nextAttempt: invoice.next_payment_attempt,
      },
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  const restaurantId = session.metadata?.restaurantId;
  if (!restaurantId || session.mode !== 'subscription') return;

  // Fetch the subscription to get full details
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdate({
    ...subscription,
    metadata: { ...subscription.metadata, restaurantId },
  });
}
