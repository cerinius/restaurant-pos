import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + 'pos-salt-2024').digest('hex');
}

async function main() {
  console.log('Seeding database...');

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
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
        loyaltyEnabled: false,
        onlineOrderingEnabled: false,
        kdsEnabled: true,
        printerEnabled: true,
        taxIncluded: false,
      },
    },
  });

  const location = await prisma.location.upsert({
    where: { id: 'main-location' },
    update: {},
    create: {
      id: 'main-location',
      restaurantId: restaurant.id,
      name: 'Main Location',
      address: '123 Main Street, New York, NY 10001',
      phone: '+1 (555) 123-4567',
      timezone: 'America/New_York',
      isActive: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { id: 'user-owner' },
    update: {},
    create: {
      id: 'user-owner',
      restaurantId: restaurant.id,
      name: 'Owner Admin',
      email: 'owner@grandbistro.com',
      pin: hashPin('1234'),
      role: 'OWNER',
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { id: 'user-manager' },
    update: {},
    create: {
      id: 'user-manager',
      restaurantId: restaurant.id,
      name: 'Jane Manager',
      email: 'manager@grandbistro.com',
      pin: hashPin('2222'),
      role: 'MANAGER',
      isActive: true,
    },
  });

  const server1 = await prisma.user.upsert({
    where: { id: 'user-server1' },
    update: {},
    create: {
      id: 'user-server1',
      restaurantId: restaurant.id,
      name: 'Alex Server',
      email: 'server@grandbistro.com',
      pin: hashPin('3333'),
      role: 'SERVER',
      isActive: true,
    },
  });

  const bartender = await prisma.user.upsert({
    where: { id: 'user-bartender' },
    update: {},
    create: {
      id: 'user-bartender',
      restaurantId: restaurant.id,
      name: 'Sam Bartender',
      email: 'bartender@grandbistro.com',
      pin: hashPin('4444'),
      role: 'BARTENDER',
      isActive: true,
    },
  });

  for (const userId of [owner.id, manager.id, server1.id, bartender.id]) {
    await prisma.userLocation.upsert({
      where: { userId_locationId: { userId, locationId: location.id } },
      update: {},
      create: { userId, locationId: location.id },
    });
  }

  const salesTax = await prisma.tax.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Sales Tax' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Sales Tax',
      type: 'PERCENTAGE',
      rate: 8.875,
      isDefault: true,
      appliesToAll: true,
      isActive: true,
    },
  });

  const kitchenStation = await prisma.station.upsert({
    where: { restaurantId_locationId_name: { restaurantId: restaurant.id, locationId: location.id, name: 'Kitchen' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      locationId: location.id,
      name: 'Kitchen',
      type: 'KITCHEN',
      color: '#EF4444',
      isActive: true,
      displayOrder: 1,
    },
  });

  const barStation = await prisma.station.upsert({
    where: { restaurantId_locationId_name: { restaurantId: restaurant.id, locationId: location.id, name: 'Bar' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      locationId: location.id,
      name: 'Bar',
      type: 'BAR',
      color: '#8B5CF6',
      isActive: true,
      displayOrder: 2,
    },
  });

  const expoStation = await prisma.station.upsert({
    where: { restaurantId_locationId_name: { restaurantId: restaurant.id, locationId: location.id, name: 'Expo' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      locationId: location.id,
      name: 'Expo',
      type: 'EXPO',
      color: '#F59E0B',
      isActive: true,
      displayOrder: 3,
    },
  });

  const appetizersCategory = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Appetizers' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Appetizers',
      description: 'Start your meal right',
      sortOrder: 1,
      isActive: true,
      dayParts: ['ALL_DAY'],
    },
  });

  const burgersCategory = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Burgers' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Burgers',
      description: 'Handcrafted burgers',
      sortOrder: 2,
      isActive: true,
      dayParts: ['LUNCH', 'DINNER'],
    },
  });

  const pizzaCategory = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Pizza' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Pizza',
      description: 'Wood-fired pizzas',
      sortOrder: 3,
      isActive: true,
      dayParts: ['LUNCH', 'DINNER'],
    },
  });

  const drinksCategory = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Drinks' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Drinks',
      description: 'Beverages & cocktails',
      sortOrder: 4,
      isActive: true,
      dayParts: ['ALL_DAY'],
    },
  });

  const dessertsCategory = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Desserts' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Desserts',
      description: 'Sweet endings',
      sortOrder: 5,
      isActive: true,
      dayParts: ['ALL_DAY'],
    },
  });

  const breakfastCategory = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Breakfast' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Breakfast',
      description: 'Morning favorites',
      sortOrder: 6,
      isActive: true,
      dayParts: ['BREAKFAST'],
    },
  });

  const tempGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Cooking Temperature',
      type: 'SINGLE',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 1,
      modifiers: {
        create: [
          { name: 'Rare', priceAdjustment: 0, sortOrder: 1 },
          { name: 'Medium Rare', priceAdjustment: 0, isDefault: true, sortOrder: 2 },
          { name: 'Medium', priceAdjustment: 0, sortOrder: 3 },
          { name: 'Medium Well', priceAdjustment: 0, sortOrder: 4 },
          { name: 'Well Done', priceAdjustment: 0, sortOrder: 5 },
        ],
      },
    },
  });

  const sizeGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Size',
      type: 'SINGLE',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 2,
      modifiers: {
        create: [
          { name: 'Small', priceAdjustment: -2, sortOrder: 1 },
          { name: 'Regular', priceAdjustment: 0, isDefault: true, sortOrder: 2 },
          { name: 'Large', priceAdjustment: 3, sortOrder: 3 },
        ],
      },
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
      sortOrder: 3,
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

  const pizzaToppingGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Toppings',
      type: 'MULTIPLE',
      isRequired: false,
      minSelections: 0,
      maxSelections: 8,
      sortOrder: 4,
      modifiers: {
        create: [
          { name: 'Pepperoni', priceAdjustment: 1.5, sortOrder: 1 },
          { name: 'Mushrooms', priceAdjustment: 1, sortOrder: 2 },
          { name: 'Bell Peppers', priceAdjustment: 1, sortOrder: 3 },
          { name: 'Onions', priceAdjustment: 0.75, sortOrder: 4 },
          { name: 'Black Olives', priceAdjustment: 0.75, sortOrder: 5 },
          { name: 'Italian Sausage', priceAdjustment: 2, sortOrder: 6 },
          { name: 'Spinach', priceAdjustment: 1, sortOrder: 7 },
          { name: 'Sun-dried Tomatoes', priceAdjustment: 1.5, sortOrder: 8 },
        ],
      },
    },
  });

  const drinkSizeGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Drink Size',
      type: 'SINGLE',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 5,
      modifiers: {
        create: [
          { name: '12oz', priceAdjustment: -1, sortOrder: 1 },
          { name: '16oz', priceAdjustment: 0, isDefault: true, sortOrder: 2 },
          { name: '20oz', priceAdjustment: 1, sortOrder: 3 },
        ],
      },
    },
  });

  const nachos = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: appetizersCategory.id,
      name: 'Loaded Nachos',
      description: 'Tortilla chips with cheese, jalapeños, sour cream, guacamole',
      basePrice: 14.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 12,
      sortOrder: 1,
      stationId: kitchenStation.id,
      dayParts: ['ALL_DAY'],
      allergens: ['dairy', 'gluten'],
      calories: 850,
    },
  });

  const wings = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: appetizersCategory.id,
      name: 'Buffalo Wings',
      description: 'Crispy wings with buffalo sauce and blue cheese dip',
      basePrice: 16.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 15,
      sortOrder: 2,
      stationId: kitchenStation.id,
      dayParts: ['ALL_DAY'],
      calories: 680,
    },
  });

  const calamari = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: appetizersCategory.id,
      name: 'Fried Calamari',
      description: 'Golden fried calamari with marinara sauce',
      basePrice: 13.99,
      status: 'ACTIVE',
      prepTime: 10,
      sortOrder: 3,
      stationId: kitchenStation.id,
      dayParts: ['ALL_DAY'],
      allergens: ['shellfish', 'gluten'],
      calories: 420,
    },
  });

  const classicBurger = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: burgersCategory.id,
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
      modifierGroups: {
        create: [
          { modifierGroupId: tempGroup.id, sortOrder: 1 },
          { modifierGroupId: extrasGroup.id, sortOrder: 2 },
        ],
      },
    },
  });

  const bbqBurger = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: burgersCategory.id,
      name: 'BBQ Smokehouse Burger',
      description: 'Beef patty, BBQ sauce, crispy onion rings, cheddar',
      basePrice: 18.99,
      status: 'ACTIVE',
      isFeatured: true,
      prepTime: 15,
      sortOrder: 2,
      stationId: kitchenStation.id,
      dayParts: ['LUNCH', 'DINNER'],
      allergens: ['gluten', 'dairy'],
      calories: 950,
      modifierGroups: {
        create: [
          { modifierGroupId: tempGroup.id, sortOrder: 1 },
          { modifierGroupId: extrasGroup.id, sortOrder: 2 },
        ],
      },
    },
  });

  const margheritaPizza = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzaCategory.id,
      name: 'Margherita',
      description: 'San Marzano tomatoes, fresh mozzarella, basil',
      basePrice: 16.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 20,
      sortOrder: 1,
      stationId: kitchenStation.id,
      dayParts: ['LUNCH', 'DINNER'],
      allergens: ['gluten', 'dairy'],
      calories: 780,
      modifierGroups: {
        create: [
          { modifierGroupId: sizeGroup.id, sortOrder: 1 },
          { modifierGroupId: pizzaToppingGroup.id, sortOrder: 2 },
        ],
      },
    },
  });

  const pepperoniPizza = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: pizzaCategory.id,
      name: 'Pepperoni Feast',
      description: 'Double pepperoni, mozzarella, tomato sauce',
      basePrice: 19.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 20,
      sortOrder: 2,
      stationId: kitchenStation.id,
      dayParts: ['LUNCH', 'DINNER'],
      allergens: ['gluten', 'dairy'],
      calories: 920,
      modifierGroups: {
        create: [
          { modifierGroupId: sizeGroup.id, sortOrder: 1 },
          { modifierGroupId: pizzaToppingGroup.id, sortOrder: 2 },
        ],
      },
    },
  });

  const sodas = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinksCategory.id,
      name: 'Soft Drink',
      description: 'Coke, Diet Coke, Sprite, Lemonade',
      basePrice: 3.99,
      status: 'ACTIVE',
      prepTime: 1,
      sortOrder: 1,
      stationId: barStation.id,
      dayParts: ['ALL_DAY'],
      calories: 150,
      modifierGroups: {
        create: [{ modifierGroupId: drinkSizeGroup.id, sortOrder: 1 }],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinksCategory.id,
      name: 'Craft Beer',
      description: 'Selection of local craft beers',
      basePrice: 7.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 2,
      sortOrder: 2,
      stationId: barStation.id,
      dayParts: ['ALL_DAY'],
      calories: 200,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinksCategory.id,
      name: 'Classic Cocktail',
      description: 'Old Fashioned, Margarita, or Mojito',
      basePrice: 13.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 5,
      sortOrder: 3,
      stationId: barStation.id,
      dayParts: ['ALL_DAY'],
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: dessertsCategory.id,
      name: 'New York Cheesecake',
      description: 'Classic NY cheesecake with berry compote',
      basePrice: 8.99,
      status: 'ACTIVE',
      isPopular: true,
      prepTime: 5,
      sortOrder: 1,
      stationId: kitchenStation.id,
      dayParts: ['ALL_DAY'],
      allergens: ['dairy', 'gluten', 'eggs'],
      calories: 480,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: dessertsCategory.id,
      name: 'Chocolate Lava Cake',
      description: 'Warm chocolate cake with vanilla ice cream',
      basePrice: 9.99,
      status: 'ACTIVE',
      prepTime: 12,
      sortOrder: 2,
      stationId: kitchenStation.id,
      dayParts: ['ALL_DAY'],
      allergens: ['dairy', 'gluten', 'eggs'],
      calories: 650,
    },
  });

  const tableData = [
    { name: 'T1', capacity: 2, positionX: 100, positionY: 100, shape: 'circle', section: 'Main' },
    { name: 'T2', capacity: 2, positionX: 220, positionY: 100, shape: 'circle', section: 'Main' },
    { name: 'T3', capacity: 4, positionX: 340, positionY: 100, shape: 'rectangle', section: 'Main' },
    { name: 'T4', capacity: 4, positionX: 460, positionY: 100, shape: 'rectangle', section: 'Main' },
    { name: 'T5', capacity: 6, positionX: 100, positionY: 260, shape: 'rectangle', section: 'Main' },
    { name: 'T6', capacity: 6, positionX: 280, positionY: 260, shape: 'rectangle', section: 'Main' },
    { name: 'T7', capacity: 8, positionX: 460, positionY: 260, shape: 'rectangle', section: 'Main' },
    { name: 'T8', capacity: 4, positionX: 100, positionY: 420, shape: 'square', section: 'Patio' },
    { name: 'T9', capacity: 4, positionX: 260, positionY: 420, shape: 'square', section: 'Patio' },
    { name: 'T10', capacity: 2, positionX: 420, positionY: 420, shape: 'circle', section: 'Patio' },
    { name: 'B1', capacity: 2, positionX: 100, positionY: 580, shape: 'circle', section: 'Bar' },
    { name: 'B2', capacity: 2, positionX: 200, positionY: 580, shape: 'circle', section: 'Bar' },
    { name: 'B3', capacity: 2, positionX: 300, positionY: 580, shape: 'circle', section: 'Bar' },
    { name: 'B4', capacity: 2, positionX: 400, positionY: 580, shape: 'circle', section: 'Bar' },
    { name: 'VIP1', capacity: 10, positionX: 600, positionY: 100, shape: 'rectangle', section: 'VIP' },
  ];

  for (const table of tableData) {
    await prisma.table.upsert({
      where: { locationId_name: { locationId: location.id, name: table.name } },
      update: {},
      create: {
        locationId: location.id,
        ...table,
        status: 'AVAILABLE',
        isActive: true,
      },
    });
  }

  await prisma.happyHour.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Happy Hour',
      startTime: '16:00',
      endTime: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      discountType: 'PERCENTAGE',
      discountValue: 25,
      categoryIds: [drinksCategory.id],
      isActive: true,
    },
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
      {
        restaurantId: restaurant.id,
        name: '10% Off',
        type: 'PERCENTAGE',
        value: 10,
        requiresManagerApproval: false,
        isActive: true,
      },
      {
        restaurantId: restaurant.id,
        name: '$5 Off',
        type: 'FLAT',
        value: 5,
        requiresManagerApproval: false,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.stationCategory.createMany({
    data: [
      { stationId: kitchenStation.id, categoryId: appetizersCategory.id },
      { stationId: kitchenStation.id, categoryId: burgersCategory.id },
      { stationId: kitchenStation.id, categoryId: pizzaCategory.id },
      { stationId: kitchenStation.id, categoryId: dessertsCategory.id },
      { stationId: barStation.id, categoryId: drinksCategory.id },
    ],
    skipDuplicates: true,
  });

  await prisma.combo.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Burger & Drink Combo',
      description: 'Any burger + any soft drink',
      price: 17.99,
      isActive: true,
      items: {
        create: [
          { menuItemId: classicBurger.id, quantity: 1, allowSubstitutions: true },
          { menuItemId: sodas.id, quantity: 1, allowSubstitutions: true },
        ],
      },
    },
  });

  await prisma.giftCard.createMany({
    data: [
      { restaurantId: restaurant.id, code: 'GIFT-0001', balance: 50, initialValue: 50 },
      { restaurantId: restaurant.id, code: 'GIFT-0002', balance: 100, initialValue: 100 },
      { restaurantId: restaurant.id, code: 'GIFT-0003', balance: 25, initialValue: 25 },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });