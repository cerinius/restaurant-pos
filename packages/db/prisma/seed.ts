import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const IDS = {
  restaurant: 'demo-restaurant-id',
  location: 'main-location',
  owner: 'user-owner',
  manager: 'user-manager',
  server: 'user-server',
  bartender: 'user-bartender',
};

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + 'pos-salt-2024').digest('hex');
}

async function main() {
  console.log('Seeding demo data...');

  // clean dependent demo data first
  await prisma.userSession.deleteMany({
    where: { userId: { in: [IDS.owner, IDS.manager, IDS.server, IDS.bartender] } },
  });

  await prisma.userLocation.deleteMany({
    where: { userId: { in: [IDS.owner, IDS.manager, IDS.server, IDS.bartender] } },
  });

  await prisma.stationCategory.deleteMany({});
  await prisma.comboItem.deleteMany({});
  await prisma.combo.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.giftCard.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.discount.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.happyHour.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.table.deleteMany({ where: { locationId: IDS.location } });
  await prisma.menuItemModifierGroup.deleteMany({});
  await prisma.modifier.deleteMany({});
  await prisma.modifierGroup.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.menuItem.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.menuCategory.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.station.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.tax.deleteMany({ where: { restaurantId: IDS.restaurant } });
  await prisma.user.deleteMany({
    where: { id: { in: [IDS.owner, IDS.manager, IDS.server, IDS.bartender] } },
  });
  await prisma.location.deleteMany({ where: { id: IDS.location } });
  await prisma.restaurant.deleteMany({ where: { id: IDS.restaurant } });

  const restaurant = await prisma.restaurant.create({
    data: {
      id: IDS.restaurant,
      name: 'The Grand Bistro',
      slug: 'demo-restaurant',
      address: '123 Main Street, New York, NY 10001',
      phone: '+1 (555) 123-4567',
      email: 'info@grandbistro.com',
      timezone: 'America/New_York',
      currency: 'USD',
      serviceMode: 'FULL_SERVICE',
      settings: {
        requireTableForDineIn: true,
        allowSplitBills: true,
        defaultTipPercentages: [15, 18, 20, 25],
        autoFireDelay: 0,
        receiptFooter: 'Thank you for dining with us!',
        kdsEnabled: true,
      },
    },
  });

  const location = await prisma.location.create({
    data: {
      id: IDS.location,
      restaurantId: restaurant.id,
      name: 'Main Location',
      address: '123 Main Street, New York, NY 10001',
      phone: '+1 (555) 123-4567',
      timezone: 'America/New_York',
      isActive: true,
    },
  });

  const owner = await prisma.user.create({
    data: {
      id: IDS.owner,
      restaurantId: restaurant.id,
      name: 'Owner Admin',
      email: 'owner@grandbistro.com',
      pin: hashPin('1234'),
      role: 'OWNER',
      isActive: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      id: IDS.manager,
      restaurantId: restaurant.id,
      name: 'Jane Manager',
      email: 'manager@grandbistro.com',
      pin: hashPin('2222'),
      role: 'MANAGER',
      isActive: true,
    },
  });

  const server = await prisma.user.create({
    data: {
      id: IDS.server,
      restaurantId: restaurant.id,
      name: 'Alex Server',
      email: 'server@grandbistro.com',
      pin: hashPin('3333'),
      role: 'SERVER',
      isActive: true,
    },
  });

  const bartender = await prisma.user.create({
    data: {
      id: IDS.bartender,
      restaurantId: restaurant.id,
      name: 'Sam Bartender',
      email: 'bartender@grandbistro.com',
      pin: hashPin('4444'),
      role: 'BARTENDER',
      isActive: true,
    },
  });

  await prisma.userLocation.createMany({
    data: [
      { userId: owner.id, locationId: location.id },
      { userId: manager.id, locationId: location.id },
      { userId: server.id, locationId: location.id },
      { userId: bartender.id, locationId: location.id },
    ],
  });

  const salesTax = await prisma.tax.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Sales Tax',
      type: 'PERCENTAGE',
      rate: 8.875,
      isDefault: true,
      appliesToAll: true,
      isActive: true,
    },
  });

  const kitchenStation = await prisma.station.create({
    data: {
      restaurantId: restaurant.id,
      locationId: location.id,
      name: 'Kitchen',
      type: 'KITCHEN',
      color: '#EF4444',
      isActive: true,
      displayOrder: 1,
    },
  });

  const barStation = await prisma.station.create({
    data: {
      restaurantId: restaurant.id,
      locationId: location.id,
      name: 'Bar',
      type: 'BAR',
      color: '#8B5CF6',
      isActive: true,
      displayOrder: 2,
    },
  });

  const appetizers = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Appetizers',
      description: 'Start your meal right',
      sortOrder: 1,
      isActive: true,
      dayParts: ['ALL_DAY'],
    },
  });

  const burgers = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Burgers',
      description: 'Handcrafted burgers',
      sortOrder: 2,
      isActive: true,
      dayParts: ['LUNCH', 'DINNER'],
    },
  });

  const drinks = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Drinks',
      description: 'Beverages & cocktails',
      sortOrder: 3,
      isActive: true,
      dayParts: ['ALL_DAY'],
    },
  });

  const extrasGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Extras',
      type: 'MULTIPLE',
      isRequired: false,
      minSelections: 0,
      maxSelections: 5,
      modifiers: {
        create: [
          { name: 'Extra Cheese', priceAdjustment: 1.5, sortOrder: 1 },
          { name: 'Bacon', priceAdjustment: 2.5, sortOrder: 2 },
          { name: 'Avocado', priceAdjustment: 2, sortOrder: 3 },
          { name: 'Fried Egg', priceAdjustment: 1.5, sortOrder: 4 },
          { name: 'Jalapeños', priceAdjustment: 0.5, sortOrder: 5 },
        ],
      },
    },
  });

  const burger = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: burgers.id,
      name: 'Classic Burger',
      description: '8oz beef patty, lettuce, tomato, onion, pickles',
      basePrice: 15.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 15,
      sortOrder: 1,
      stationId: kitchenStation.id,
      dayParts: ['LUNCH', 'DINNER'],
      allergens: ['gluten', 'dairy'],
      calories: 720,
    },
  });

  await prisma.menuItemModifierGroup.create({
    data: {
      menuItemId: burger.id,
      modifierGroupId: extrasGroup.id,
      sortOrder: 1,
    },
  });

  const soda = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: 'Soft Drink',
      description: 'Coke, Diet Coke, Sprite, Lemonade',
      basePrice: 3.99,
      status: 'ACTIVE',
      prepTime: 1,
      sortOrder: 1,
      stationId: barStation.id,
      dayParts: ['ALL_DAY'],
      calories: 150,
    },
  });

  await prisma.table.createMany({
    data: [
      { locationId: location.id, name: 'T1', capacity: 2, status: 'AVAILABLE', positionX: 100, positionY: 100, shape: 'circle', section: 'Main', isActive: true },
      { locationId: location.id, name: 'T2', capacity: 2, status: 'AVAILABLE', positionX: 220, positionY: 100, shape: 'circle', section: 'Main', isActive: true },
      { locationId: location.id, name: 'T3', capacity: 4, status: 'AVAILABLE', positionX: 340, positionY: 100, shape: 'rectangle', section: 'Main', isActive: true },
    ],
  });

  await prisma.stationCategory.createMany({
    data: [
      { stationId: kitchenStation.id, categoryId: appetizers.id },
      { stationId: kitchenStation.id, categoryId: burgers.id },
      { stationId: barStation.id, categoryId: drinks.id },
    ],
  });

  await prisma.discount.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        name: 'Staff Meal',
        type: 'PERCENTAGE',
        value: 50,
        requiresManagerApproval: false,
        isActive: true,
        code: 'STAFF50',
      },
      {
        restaurantId: restaurant.id,
        name: 'Manager Comp',
        type: 'COMP',
        value: 100,
        requiresManagerApproval: true,
        isActive: true,
      },
    ],
  });

  await prisma.giftCard.createMany({
    data: [
      { restaurantId: restaurant.id, code: 'GIFT-0001', balance: 50, initialValue: 50 },
      { restaurantId: restaurant.id, code: 'GIFT-0002', balance: 100, initialValue: 100 },
    ],
  });

  await prisma.combo.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Burger & Drink Combo',
      description: 'Classic Burger + Soft Drink',
      price: 17.99,
      isActive: true,
      items: {
        create: [
          { menuItemId: burger.id, quantity: 1, allowSubstitutions: true },
          { menuItemId: soda.id, quantity: 1, allowSubstitutions: true },
        ],
      },
    },
  });

  console.log('Seed complete.');
  console.log('Demo restaurant slug: demo-restaurant');
  console.log('Demo location id: main-location');
  console.log('Owner PIN: 1234');
  console.log('Manager PIN: 2222');
  console.log('Server PIN: 3333');
  console.log('Bartender PIN: 4444');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });