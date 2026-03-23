
import { FastifyInstance } from 'fastify';
import { prisma } from '@pos/db';
import { WSEventType } from '@pos/shared';
import { wsManager } from '../websocket/manager';

export default async function menuRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // ââ CATEGORIES âââââââââââââââââââââââââââââââââââââââââ

  app.get('/categories', auth, async (request, reply) => {
    const user = (request as any).user;
    const { includeItems = 'false' } = request.query as { includeItems?: string };

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: user.restaurantId },
      include: {
        items: includeItems === 'true'
          ? {
              where: { status: { not: 'INACTIVE' } },
              include: { modifierGroups: { include: { modifierGroup: { include: { modifiers: true } } } } },
              orderBy: { sortOrder: 'asc' },
            }
          : false,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return reply.send({ success: true, data: categories });
  });

  app.post('/categories', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, description, image, sortOrder, isActive, dayParts, color } = request.body as any;

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: user.restaurantId,
        name,
        description,
        image,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
        dayParts: dayParts || ['ALL_DAY'],
        color,
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.MENU_UPDATED, { type: 'CATEGORY_CREATED', category });
    return reply.code(201).send({ success: true, data: category });
  });

  app.put('/categories/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const { name, description, image, sortOrder, isActive, dayParts, color } = request.body as any;

    const category = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(dayParts !== undefined && { dayParts }),
        ...(color !== undefined && { color }),
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.MENU_UPDATED, { type: 'CATEGORY_UPDATED', category });
    return reply.send({ success: true, data: category });
  });

  app.delete('/categories/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return reply.code(400).send({ success: false, error: `Cannot delete category with ${itemCount} items. Move or delete items first.` });
    }

    await prisma.menuCategory.delete({ where: { id } });
    wsManager.broadcast(user.restaurantId, WSEventType.MENU_UPDATED, { type: 'CATEGORY_DELETED', categoryId: id });
    return reply.send({ success: true, message: 'Category deleted' });
  });

  // ââ ITEMS ââââââââââââââââââââââââââââââââââââââââââââââ

  app.get('/items', auth, async (request, reply) => {
    const user = (request as any).user;
    const { categoryId, status, search, dayPart, includeInactivePricing } =
      request.query as Record<string, string>;

    const where: any = { restaurantId: user.restaurantId };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (dayPart) where.dayParts = { has: dayPart };

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
        modifierGroups: {
          include: { modifierGroup: { include: { modifiers: { orderBy: { sortOrder: 'asc' } } } } },
          orderBy: { sortOrder: 'asc' },
        },
        pricingOverrides:
          includeInactivePricing === 'true' ? true : { where: { isActive: true } },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    return reply.send({ success: true, data: items });
  });

  app.get('/items/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId: user.restaurantId },
      include: {
        category: true,
        modifierGroups: {
          include: { modifierGroup: { include: { modifiers: { orderBy: { sortOrder: 'asc' } } } } },
          orderBy: { sortOrder: 'asc' },
        },
        pricingOverrides: true,
        taxes: { include: { tax: true } },
      },
    });

    if (!item) return reply.code(404).send({ success: false, error: 'Item not found' });
    return reply.send({ success: true, data: item });
  });

  app.post('/items', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const {
      categoryId, name, description, image, basePrice,
      status, isPopular, isFeatured, prepTime, sortOrder,
      sku, barcode, calories, allergens, tags, dayParts,
      stationId, modifierGroupIds,
    } = request.body as any;

    if (!categoryId || !name || basePrice === undefined) {
      return reply.code(400).send({ success: false, error: 'categoryId, name, and basePrice are required' });
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: user.restaurantId,
        categoryId,
        name,
        description,
        image,
        basePrice,
        status: status || 'ACTIVE',
        isPopular: isPopular || false,
        isFeatured: isFeatured || false,
        prepTime: prepTime || 10,
        sortOrder: sortOrder || 0,
        sku,
        barcode,
        calories,
        allergens: allergens || [],
        tags: tags || [],
        dayParts: dayParts || ['ALL_DAY'],
        stationId,
        ...(modifierGroupIds?.length > 0 && {
          modifierGroups: {
            create: modifierGroupIds.map((mgId: string, i: number) => ({
              modifierGroupId: mgId,
              sortOrder: i,
            })),
          },
        }),
      },
      include: {
        category: true,
        modifierGroups: { include: { modifierGroup: { include: { modifiers: true } } } },
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.MENU_UPDATED, { type: 'ITEM_CREATED', item });
    return reply.code(201).send({ success: true, data: item });
  });

  app.put('/items/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    const {
      categoryId, name, description, image, basePrice,
      status, isPopular, isFeatured, prepTime, sortOrder,
      sku, barcode, calories, allergens, tags, dayParts, stationId,
    } = request.body as any;

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(basePrice !== undefined && { basePrice }),
        ...(status !== undefined && { status }),
        ...(isPopular !== undefined && { isPopular }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(prepTime !== undefined && { prepTime }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(sku !== undefined && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(calories !== undefined && { calories }),
        ...(allergens !== undefined && { allergens }),
        ...(tags !== undefined && { tags }),
        ...(dayParts !== undefined && { dayParts }),
        ...(stationId !== undefined && { stationId }),
      },
      include: {
        category: true,
        modifierGroups: { include: { modifierGroup: { include: { modifiers: true } } } },
      },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.MENU_UPDATED, { type: 'ITEM_UPDATED', item });
    return reply.send({ success: true, data: item });
  });

  // 86 item (out of stock)
  app.patch('/items/:id/86', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { restore = false } = request.body as { restore?: boolean };

    const item = await prisma.menuItem.update({
      where: { id },
      data: { status: restore ? 'ACTIVE' : 'OUT_OF_STOCK' },
    });

    wsManager.broadcast(user.restaurantId, WSEventType.ITEM_86, {
      itemId: id,
      itemName: item.name,
      status: item.status,
      restoredBy: restore ? user.name : undefined,
      eightySixedBy: !restore ? user.name : undefined,
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        userName: user.name,
        action: restore ? 'ITEM_RESTORED' : 'ITEM_86',
        entityType: 'MENU_ITEM',
        entityId: id,
        details: { itemName: item.name, status: item.status },
      },
    });

    return reply.send({ success: true, data: item, message: restore ? 'Item restored' : 'Item 86\'d' });
  });

  app.delete('/items/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    await prisma.menuItem.delete({ where: { id } });
    wsManager.broadcast(user.restaurantId, WSEventType.MENU_UPDATED, { type: 'ITEM_DELETED', itemId: id });
    return reply.send({ success: true, message: 'Item deleted' });
  });

  // ââ MODIFIER GROUPS ââââââââââââââââââââââââââââââââââââ

  app.get('/modifier-groups', auth, async (request, reply) => {
    const user = (request as any).user;
    const groups = await prisma.modifierGroup.findMany({
      where: { restaurantId: user.restaurantId },
      include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return reply.send({ success: true, data: groups });
  });

  app.post('/modifier-groups', auth, async (request, reply) => {
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, description, type, isRequired, minSelections, maxSelections, sortOrder, modifiers } = request.body as any;

    const group = await prisma.modifierGroup.create({
      data: {
        restaurantId: user.restaurantId,
        name,
        description,
        type: type || 'SINGLE',
        isRequired: isRequired || false,
        minSelections: minSelections || 0,
        maxSelections: maxSelections || 1,
        sortOrder: sortOrder || 0,
        modifiers: {
          create: (modifiers || []).map((m: any, i: number) => ({
            name: m.name,
            priceAdjustment: m.priceAdjustment || 0,
            isDefault: m.isDefault || false,
            isAvailable: true,
            sortOrder: i,
          })),
        },
      },
      include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
    });

    return reply.code(201).send({ success: true, data: group });
  });

  app.put('/modifier-groups/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, description, type, isRequired, minSelections, maxSelections, sortOrder } = request.body as any;

    const group = await prisma.modifierGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(isRequired !== undefined && { isRequired }),
        ...(minSelections !== undefined && { minSelections }),
        ...(maxSelections !== undefined && { maxSelections }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
    });

    return reply.send({ success: true, data: group });
  });

  // Add modifier to group
  app.post('/modifier-groups/:id/modifiers', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, priceAdjustment, isDefault, sortOrder } = request.body as any;

    const modifier = await prisma.modifier.create({
      data: {
        groupId: id,
        name,
        priceAdjustment: priceAdjustment || 0,
        isDefault: isDefault || false,
        isAvailable: true,
        sortOrder: sortOrder || 0,
      },
    });

    return reply.code(201).send({ success: true, data: modifier });
  });

  app.put('/modifiers/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, priceAdjustment, isDefault, isAvailable, sortOrder } = request.body as any;

    const modifier = await prisma.modifier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(priceAdjustment !== undefined && { priceAdjustment }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return reply.send({ success: true, data: modifier });
  });

  app.delete('/modifiers/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    await prisma.modifier.delete({ where: { id } });
    return reply.send({ success: true, message: 'Modifier deleted' });
  });

  // Assign modifier group to item
  app.post('/items/:itemId/modifier-groups/:groupId', auth, async (request, reply) => {
    const { itemId, groupId } = request.params as { itemId: string; groupId: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { sortOrder = 0 } = request.body as { sortOrder?: number };

    await prisma.menuItemModifierGroup.upsert({
      where: { menuItemId_modifierGroupId: { menuItemId: itemId, modifierGroupId: groupId } },
      update: { sortOrder },
      create: { menuItemId: itemId, modifierGroupId: groupId, sortOrder },
    });

    return reply.send({ success: true, message: 'Modifier group assigned' });
  });

  app.delete('/items/:itemId/modifier-groups/:groupId', auth, async (request, reply) => {
    const { itemId, groupId } = request.params as { itemId: string; groupId: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    await prisma.menuItemModifierGroup.delete({
      where: { menuItemId_modifierGroupId: { menuItemId: itemId, modifierGroupId: groupId } },
    });

    return reply.send({ success: true, message: 'Modifier group removed' });
  });

  // Pricing overrides (happy hour, daypart)
  app.post('/items/:itemId/pricing-overrides', auth, async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, price, startTime, endTime, daysOfWeek, isActive } = request.body as any;

    const override = await prisma.pricingOverride.create({
      data: { menuItemId: itemId, name, price, startTime, endTime, daysOfWeek: daysOfWeek || [], isActive: isActive !== false },
    });

    return reply.code(201).send({ success: true, data: override });
  });

  app.put('/pricing-overrides/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }
    const { name, price, startTime, endTime, daysOfWeek, isActive } = request.body as any;

    const override = await prisma.pricingOverride.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return reply.send({ success: true, data: override });
  });

  app.delete('/pricing-overrides/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
    }

    await prisma.pricingOverride.delete({ where: { id } });

    return reply.send({ success: true, message: 'Pricing override deleted' });
  });

  // Get full menu (for POS terminal)
  app.get('/full', auth, async (request, reply) => {
    const user = (request as any).user;
    const { dayPart } = request.query as { dayPart?: string };

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const currentDay = now.getDay();

    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId: user.restaurantId,
        isActive: true,
        ...(dayPart ? { dayParts: { has: dayPart as any } } : {}),
      },
      include: {
        items: {
          where: { status: { not: 'INACTIVE' } },
          include: {
            modifierGroups: {
              include: {
                modifierGroup: {
                  include: { modifiers: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
            pricingOverrides: { where: { isActive: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Check happy hours for active pricing
    const happyHours = await prisma.happyHour.findMany({
      where: { restaurantId: user.restaurantId, isActive: true },
    });

    const activeHappyHour = happyHours.find((hh:any) => {
      if (!hh.daysOfWeek.includes(currentDay)) return false;
      const [startH, startM] = hh.startTime.split(':').map(Number);
      const [endH, endM] = hh.endTime.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return currentTime >= start && currentTime <= end;
    });

    return reply.send({
      success: true,
      data: {
        categories,
        activeHappyHour: activeHappyHour || null,
        currentTime: now.toISOString(),
      },
    });
  });
}
