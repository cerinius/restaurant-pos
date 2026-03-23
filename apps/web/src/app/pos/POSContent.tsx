'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WSEventType } from '@pos/shared';

import { POSHeader } from '@/components/pos/POSHeader';
import type { POSView } from '@/components/pos/type';
import { useWebSocket } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { enqueueOfflineAction, flushOfflineActions } from '@/lib/offline-sync';
import { useAuthStore, useOrderStore } from '@/store';
import toast from 'react-hot-toast';

const MenuGrid = dynamic(
  () => import('@/components/pos/MenuGrid').then((module) => module.MenuGrid),
  {
    loading: () => (
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-800" />
        ))}
      </div>
    ),
  },
);
const OrderPanel = dynamic(
  () => import('@/components/pos/OrderPanel').then((module) => module.OrderPanel),
  {
    loading: () => <div className="h-full animate-pulse rounded-t-3xl bg-slate-900 xl:rounded-none" />,
  },
);
const TableMap = dynamic(
  () => import('@/components/pos/TableMap').then((module) => module.TableMap),
  {
    loading: () => (
      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="aspect-square animate-pulse rounded-3xl bg-slate-800" />
        ))}
      </div>
    ),
  },
);
const ModifierModal = dynamic(
  () => import('@/components/pos/ModifierModal').then((module) => module.ModifierModal),
);
const PaymentModal = dynamic(
  () => import('@/components/pos/PaymentModal').then((module) => module.PaymentModal),
);
const OrderTypeModal = dynamic(
  () => import('@/components/pos/OrderTypeModal').then((module) => module.OrderTypeModal),
);
const OpenOrdersPanel = dynamic(
  () => import('@/components/pos/OpenOrdersPanel').then((module) => module.OpenOrdersPanel),
);

interface POSContentProps {
  initialData: {
    menu: any;
    tables: any[];
    openOrders: any[];
    locationId: string | null;
  };
}

interface AddItemsPayload {
  items: any[];
  sources: any[];
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function isNetworkError(error: any) {
  return !error?.response;
}

function buildOptimisticItem(menuItem: any, payload: any, index: number) {
  const modifiers = payload.modifiers || [];
  const modifierTotal = modifiers.reduce(
    (sum: number, modifier: any) => sum + Number(modifier.priceAdjustment || 0),
    0,
  );
  const quantity = payload.quantity || 1;
  const unitPrice = Number(menuItem.basePrice || 0) + modifierTotal;

  return {
    id: `optimistic-${Date.now()}-${index}`,
    menuItemId: menuItem.id,
    menuItemName: menuItem.name,
    quantity,
    unitPrice,
    totalPrice: roundCurrency(unitPrice * quantity),
    modifiers,
    notes: payload.notes,
    courseNumber: payload.courseNumber || 1,
    seatNumber: payload.seatNumber,
    status: 'PENDING',
    isFired: false,
    isVoided: false,
    optimistic: true,
  };
}

function snapshotActiveOrder() {
  const state = useOrderStore.getState();

  return {
    orderId: state.orderId,
    tableId: state.tableId,
    tableName: state.tableName,
    locationId: state.locationId,
    orderType: state.orderType,
    items: state.items,
    guestCount: state.guestCount,
    notes: state.notes,
    subtotal: state.subtotal,
    taxTotal: state.taxTotal,
    discountTotal: state.discountTotal,
    tipTotal: state.tipTotal,
    total: state.total,
  };
}

function applyOptimisticItems(snapshot: ReturnType<typeof snapshotActiveOrder>, optimisticItems: any[]) {
  const addedSubtotal = optimisticItems.reduce(
    (sum, item) => sum + Number(item.totalPrice || 0),
    0,
  );
  const nextSubtotal = roundCurrency(snapshot.subtotal + addedSubtotal);
  const currentDiscountRate =
    snapshot.subtotal > 0 ? snapshot.discountTotal / snapshot.subtotal : 0;
  const discountedSubtotal = Math.max(0, nextSubtotal - nextSubtotal * currentDiscountRate);
  const currentTaxRate =
    snapshot.subtotal - snapshot.discountTotal > 0
      ? snapshot.taxTotal / (snapshot.subtotal - snapshot.discountTotal)
      : 0.13;
  const nextDiscountTotal = roundCurrency(nextSubtotal * currentDiscountRate);
  const nextTaxTotal = roundCurrency(discountedSubtotal * currentTaxRate);

  return {
    ...snapshot,
    items: [...snapshot.items, ...optimisticItems],
    subtotal: nextSubtotal,
    discountTotal: nextDiscountTotal,
    taxTotal: nextTaxTotal,
    total: roundCurrency(discountedSubtotal + nextTaxTotal + snapshot.tipTotal),
  };
}

export default function POSContent({ initialData }: POSContentProps) {
  const { locationId, setLocation } = useAuthStore();
  const { orderId, setOrder, clearOrder } = useOrderStore();
  const queryClient = useQueryClient();
  const [view, setView] = useState<POSView>('tables');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [pendingItem, setPendingItem] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showOrderType, setShowOrderType] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showMobileOrderPanel, setShowMobileOrderPanel] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const effectiveLocationId = locationId || initialData.locationId || null;

  useEffect(() => {
    if (!locationId && initialData.locationId) {
      setLocation(initialData.locationId);
    }
  }, [initialData.locationId, locationId, setLocation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncStatus = () => setIsOffline(!navigator.onLine);
    syncStatus();
    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);

    return () => {
      window.removeEventListener('online', syncStatus);
      window.removeEventListener('offline', syncStatus);
    };
  }, []);

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['full-menu', effectiveLocationId],
    queryFn: () => api.getFullMenu(),
    staleTime: 1000 * 60 * 5,
    enabled: !!effectiveLocationId,
    initialData: initialData.menu ? { success: true, data: initialData.menu } : undefined,
  });

  const { data: currentOrderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId!),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (currentOrderData?.data) {
      setOrder(currentOrderData.data);
    }
  }, [currentOrderData, setOrder]);

  const flushQueuedActions = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      await flushOfflineActions(async (action) => {
        if (action.type === 'ADD_ITEMS') {
          const result = await api.addItemsToOrder(action.payload.orderId, action.payload.items);
          if (action.payload.orderId === useOrderStore.getState().orderId) {
            startTransition(() => setOrder(result.data));
          }
        }

        if (action.type === 'FIRE_ORDER') {
          await api.fireOrder(
            action.payload.orderId,
            action.payload.courseNumber,
            action.payload.priority,
          );
        }
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tables'] }),
        queryClient.invalidateQueries({ queryKey: ['open-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
      ]);
    } catch {
      // Leave queued actions intact and retry on the next online event.
    }
  }, [orderId, queryClient, setOrder]);

  useEffect(() => {
    flushQueuedActions();
    window.addEventListener('online', flushQueuedActions);

    return () => window.removeEventListener('online', flushQueuedActions);
  }, [flushQueuedActions]);

  const createOrderMutation = useMutation({
    mutationFn: (payload: any) => api.createOrder(payload),
    onSuccess: async (data) => {
      setOrder(data.data);
      setView('menu');
      setShowMobileOrderPanel(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['tables'] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create order');
    },
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ items }: AddItemsPayload) => api.addItemsToOrder(orderId!, items),
    onMutate: async (variables) => {
      const previousOrder = snapshotActiveOrder();
      const optimisticItems = variables.sources.map((source, index) =>
        buildOptimisticItem(source, variables.items[index], index),
      );

      useOrderStore.setState(applyOptimisticItems(previousOrder, optimisticItems));
      return { previousOrder };
    },
    onSuccess: (data) => {
      setOrder(data.data);
      setPendingItem(null);
    },
    onError: async (err: any, variables, context) => {
      if (isNetworkError(err) && orderId) {
        await enqueueOfflineAction('ADD_ITEMS', { orderId, items: variables.items });
        setPendingItem(null);
        toast.success('Connection lost. Item queued for sync.');
        return;
      }

      if (context?.previousOrder) {
        useOrderStore.setState(context.previousOrder);
      }

      toast.error(err?.response?.data?.error || 'Failed to add item');
    },
  });

  const fireMutation = useMutation({
    mutationFn: ({ courseNumber, priority }: any) =>
      api.fireOrder(orderId!, courseNumber, priority),
    onSuccess: async (data) => {
      setOrder(data.data);
      toast.success('Order sent to kitchen');
      await queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
    },
    onError: async (err: any, variables) => {
      if (isNetworkError(err) && orderId) {
        await enqueueOfflineAction('FIRE_ORDER', {
          orderId,
          courseNumber: variables.courseNumber,
          priority: variables.priority,
        });
        toast.success('Kitchen fire queued. It will sync once the connection returns.');
        return;
      }

      toast.error(err?.response?.data?.error || 'Failed to fire order');
    },
  });

  useWebSocket(
    {
      [WSEventType.ORDER_UPDATED]: (payload) => {
        if (payload?.id === orderId) {
          setOrder(payload);
        }
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['open-orders'] });
      },
      [WSEventType.TABLE_STATUS_CHANGED]: () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] });
      },
      [WSEventType.ITEM_86]: (payload) => {
        toast.error(`${payload?.itemName} is now 86'd`, { duration: 5000 });
        queryClient.invalidateQueries({ queryKey: ['full-menu'] });
      },
    },
    [orderId, queryClient, setOrder],
  );

  const handleTableSelect = useCallback(
    (table: any) => {
      setSelectedTable(table);
      if (table.orders && table.orders.length > 0) {
        const existingOrder = table.orders[0];
        setOrder(existingOrder);
        setView('menu');
        setShowMobileOrderPanel(true);
      } else {
        setShowOrderType(true);
      }
    },
    [setOrder],
  );

  const handleStartOrder = useCallback(
    async (type: string, guestCount?: number) => {
      if (!effectiveLocationId) return;
      setShowOrderType(false);
      await createOrderMutation.mutateAsync({
        locationId: effectiveLocationId,
        tableId: selectedTable?.id,
        type,
        guestCount: guestCount || 1,
      });
    },
    [createOrderMutation, effectiveLocationId, selectedTable],
  );

  const handleItemSelect = useCallback(
    (item: any) => {
      if (!orderId) {
        toast.error('Please select a table first');
        return;
      }

      const hasRequiredModifiers = item.modifierGroups?.some(
        (modifierGroup: any) => modifierGroup.modifierGroup?.isRequired,
      );

      if (hasRequiredModifiers || item.modifierGroups?.length > 0) {
        setPendingItem(item);
        return;
      }

      addItemsMutation.mutate({
        items: [
          {
            menuItemId: item.id,
            quantity: 1,
            modifiers: [],
          },
        ],
        sources: [item],
      });
    },
    [addItemsMutation, orderId],
  );

  const handleModifierConfirm = useCallback(
    (item: any, modifiers: any[], notes: string, quantity: number) => {
      addItemsMutation.mutate({
        items: [
          {
            menuItemId: item.id,
            quantity,
            modifiers,
            notes,
          },
        ],
        sources: [item],
      });
    },
    [addItemsMutation],
  );

  const handleNewOrder = useCallback(() => {
    clearOrder();
    setSelectedTable(null);
    setView('tables');
    setShowMobileOrderPanel(false);
  }, [clearOrder]);

  const categories = menuData?.data?.categories || [];
  const activeHappyHour = menuData?.data?.activeHappyHour;
  const panelVisible = showMobileOrderPanel || !!orderId;
  const contentPaddingClass = 'pb-24 md:pb-0';
  const mainPanel = useMemo(() => {
    if (view === 'tables') {
      return (
        <TableMap
          initialTables={initialData.tables}
          locationId={effectiveLocationId || ''}
          onTableSelect={handleTableSelect}
          selectedTableId={selectedTable?.id}
        />
      );
    }

    if (view === 'open-orders') {
      return (
        <OpenOrdersPanel
          initialOrders={initialData.openOrders}
          locationId={effectiveLocationId || ''}
          onOrderSelect={(order) => {
            setOrder(order);
            setView('menu');
            setShowMobileOrderPanel(true);
          }}
        />
      );
    }

    return (
      <MenuGrid
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
        onItemSelect={handleItemSelect}
        activeHappyHour={activeHappyHour}
        isLoading={menuLoading && categories.length === 0}
      />
    );
  }, [
    activeCategoryId,
    activeHappyHour,
    categories,
    effectiveLocationId,
    handleItemSelect,
    handleTableSelect,
    initialData.openOrders,
    initialData.tables,
    menuLoading,
    selectedTable?.id,
    setOrder,
    view,
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950">
      <POSHeader
        view={view}
        onViewChange={setView}
        onNewOrder={handleNewOrder}
        hasActiveOrder={!!orderId}
        onToggleOrderPanel={() => setShowMobileOrderPanel((current) => !current)}
        isOrderPanelOpen={panelVisible}
        isOffline={isOffline}
      />

      {isOffline && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">
          Offline mode is active. Existing orders keep working and queued changes will sync when the
          connection returns.
        </div>
      )}

      <div className={clsx('flex flex-1 flex-col overflow-hidden xl:flex-row', contentPaddingClass)}>
        <div className="flex-1 overflow-hidden">{mainPanel}</div>

        <div
          className={clsx(
            'shrink-0 xl:block xl:h-auto xl:w-80',
            panelVisible ? 'block' : 'hidden',
          )}
        >
          <div className="h-[42vh] xl:h-full">
            <OrderPanel
              mobile
              onFire={(courseNumber, priority) =>
                fireMutation.mutate({ courseNumber, priority })
              }
              onPay={() => setShowPayment(true)}
              isFiring={fireMutation.isPending}
            />
          </div>
        </div>
      </div>

      {pendingItem && (
        <ModifierModal
          item={pendingItem}
          onConfirm={handleModifierConfirm}
          onClose={() => setPendingItem(null)}
        />
      )}

      {showPayment && orderId && (
        <PaymentModal
          orderId={orderId}
          onClose={() => setShowPayment(false)}
          onPaid={() => {
            setShowPayment(false);
            clearOrder();
            setSelectedTable(null);
            setView('tables');
            setShowMobileOrderPanel(false);
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['open-orders'] });
            toast.success('Payment complete');
          }}
        />
      )}

      {showOrderType && (
        <OrderTypeModal
          table={selectedTable}
          onConfirm={handleStartOrder}
          onClose={() => {
            setShowOrderType(false);
            setSelectedTable(null);
          }}
        />
      )}
    </div>
  );
}
