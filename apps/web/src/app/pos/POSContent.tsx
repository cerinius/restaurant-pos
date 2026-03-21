'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useOrderStore } from '@/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WSEventType } from '@pos/shared';

import { TableMap } from '@/components/pos/TableMap';
import { MenuGrid } from '@/components/pos/MenuGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { ModifierModal } from '@/components/pos/ModifierModal';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { OrderTypeModal } from '@/components/pos/OrderTypeModal';
import { POSHeader } from '@/components/pos/POSHeader';
import { OpenOrdersPanel } from '@/components/pos/OpenOrdersPanel';
import type { POSView } from '@/components/pos/type';

export default function POSContent() {
  const { user, locationId } = useAuthStore();
  const { orderId, setOrder, clearOrder } = useOrderStore();
  const queryClient = useQueryClient();

  const [view, setView] = useState<POSView>('tables');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [pendingItem, setPendingItem] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showOrderType, setShowOrderType] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const { data: menuData } = useQuery({
    queryKey: ['full-menu', locationId],
    queryFn: () => api.getFullMenu(),
    staleTime: 1000 * 60 * 5,
    enabled: !!locationId,
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

  const createOrderMutation = useMutation({
    mutationFn: (payload: any) => api.createOrder(payload),
    onSuccess: (data) => {
      setOrder(data.data);
      setView('menu');
      queryClient.invalidateQueries({ queryKey: ['open-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create order');
    },
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ items }: { items: any[] }) => api.addItemsToOrder(orderId!, items),
    onSuccess: (data) => {
      setOrder(data.data);
      setPendingItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to add item');
    },
  });

  const fireMutation = useMutation({
    mutationFn: ({ courseNumber, priority }: any) =>
      api.fireOrder(orderId!, courseNumber, priority),
    onSuccess: (data) => {
      setOrder(data.data);
      toast.success('Order sent to kitchen! 🔥');
      queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
    },
    onError: (err: any) => {
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
        toast.error(`⚠️ ${payload?.itemName} is now 86'd`, { duration: 5000 });
        queryClient.invalidateQueries({ queryKey: ['full-menu'] });
      },
    },
    [orderId]
  );

  const handleTableSelect = useCallback(
    (table: any) => {
      setSelectedTable(table);
      if (table.orders && table.orders.length > 0) {
        const existingOrder = table.orders[0];
        setOrder(existingOrder);
        setView('menu');
      } else {
        setShowOrderType(true);
      }
    },
    [setOrder]
  );

  const handleStartOrder = useCallback(
    async (type: string, guestCount?: number) => {
      if (!locationId) return;
      setShowOrderType(false);
      await createOrderMutation.mutateAsync({
        locationId,
        tableId: selectedTable?.id,
        type,
        guestCount: guestCount || 1,
      });
    },
    [locationId, selectedTable, createOrderMutation]
  );

  const handleItemSelect = useCallback(
    (item: any) => {
      if (!orderId) {
        toast.error('Please select a table first');
        return;
      }

      const hasRequiredModifiers = item.modifierGroups?.some(
        (mg: any) => mg.modifierGroup?.isRequired
      );

      if (hasRequiredModifiers || item.modifierGroups?.length > 0) {
        setPendingItem(item);
      } else {
        addItemsMutation.mutate({
          items: [
            {
              menuItemId: item.id,
              quantity: 1,
              modifiers: [],
            },
          ],
        });
      }
    },
    [orderId, addItemsMutation]
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
      });
    },
    [addItemsMutation]
  );

  const handleNewOrder = useCallback(() => {
    clearOrder();
    setSelectedTable(null);
    setView('tables');
  }, [clearOrder]);

  const categories = menuData?.data?.categories || [];

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <POSHeader
        view={view}
        onViewChange={setView}
        onNewOrder={handleNewOrder}
        hasActiveOrder={!!orderId}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {view === 'tables' && (
            <TableMap
              locationId={locationId || ''}
              onTableSelect={handleTableSelect}
              selectedTableId={selectedTable?.id}
            />
          )}

          {view === 'menu' && (
            <MenuGrid
              categories={categories}
              activeCategoryId={activeCategoryId}
              onCategoryChange={setActiveCategoryId}
              onItemSelect={handleItemSelect}
              activeHappyHour={menuData?.data?.activeHappyHour}
            />
          )}

          {view === 'open-orders' && (
            <OpenOrdersPanel
              locationId={locationId || ''}
              onOrderSelect={(order) => {
                setOrder(order);
                setView('menu');
              }}
            />
          )}
        </div>

        <OrderPanel
          onFire={(courseNumber, priority) =>
            fireMutation.mutate({ courseNumber, priority })
          }
          onPay={() => setShowPayment(true)}
          isFiring={fireMutation.isPending}
        />
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
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['open-orders'] });
            toast.success('Payment complete! 💳');
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