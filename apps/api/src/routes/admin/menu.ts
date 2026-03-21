import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';
import { prisma } from '@pos/db';
const categoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const itemBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().nonnegative(),
  imageUrl: z.string().optional().default(''),
  categoryId: z.string().min(1),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

const querySchema = z.object({
  categoryId: z.string().optional(),
});

const adminMenuRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Categories
  fastify.get('/admin/menu/categories', async (_request, reply) => {
    const categories = await prisma.menuCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    return reply.send(categories);
  });

  fastify.post('/admin/menu/categories', async (request, reply) => {
    const body = categoryBodySchema.parse(request.body);

    const existing = await prisma.menuCategory.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return reply.code(400).send({
        message: 'A category with this slug already exists.',
      });
    }

    const category = await prisma.menuCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });

    return reply.code(201).send(category);
  });

  fastify.patch('/admin/menu/categories/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = categoryBodySchema.partial().parse(request.body);

    if (body.slug) {
      const existing = await prisma.menuCategory.findFirst({
        where: {
          slug: body.slug,
          NOT: { id },
        },
      });

      if (existing) {
        return reply.code(400).send({
          message: 'A category with this slug already exists.',
        });
      }
    }

    const category = await prisma.menuCategory.update({
      where: { id },
      data: body,
    });

    return reply.send(category);
  });

  fastify.delete('/admin/menu/categories/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const itemCount = await prisma.menuItem.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      return reply.code(400).send({
        message: 'Cannot delete category with existing menu items. Remove or reassign items first.',
      });
    }

    await prisma.menuCategory.delete({
      where: { id },
    });

    return reply.code(204).send();
  });

  // Items
  fastify.get('/admin/menu/items', async (request, reply) => {
    const { categoryId } = querySchema.parse(request.query);

    const items = await prisma.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: true,
      },
    });

    return reply.send(items);
  });

  fastify.post('/admin/menu/items', async (request, reply) => {
    const body = itemBodySchema.parse(request.body);

    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        imageUrl: body.imageUrl,
        categoryId: body.categoryId,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
      include: {
        category: true,
      },
    });

    return reply.code(201).send(item);
  });

  fastify.patch('/admin/menu/items/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = itemBodySchema.partial().parse(request.body);

    const item = await prisma.menuItem.update({
      where: { id },
      data: body,
      include: {
        category: true,
      },
    });

    return reply.send(item);
  });

  fastify.delete('/admin/menu/items/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    await prisma.menuItem.delete({
      where: { id },
    });

    return reply.code(204).send();
  });
};

export default fp(adminMenuRoutes, {
  name: 'admin-menu-routes',
});