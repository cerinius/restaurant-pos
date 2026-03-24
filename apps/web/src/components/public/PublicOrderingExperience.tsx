'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { ModifierModal } from '@/components/pos/ModifierModal';

interface PublicOrderingExperienceProps {
  restaurantId: string;
  restaurantName: string;
  accent: string;
  menu: any[];
  locations: any[];
}

interface CartItem {
  id: string;
  signature: string;
  menuItemId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  modifiers: Array<{
    modifierId: string;
    modifierName: string;
    groupName: string;
    priceAdjustment: number;
  }>;
  notes: string;
}

function formatCurrency(amount: number) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function createCartItemId() {
  return `cart-${Math.random().toString(36).slice(2, 10)}`;
}

function getCartSignature(menuItemId: string, modifiers: CartItem['modifiers'], notes: string) {
  const modifierIds = [...modifiers]
    .map((modifier) => modifier.modifierId)
    .sort((left, right) => left.localeCompare(right))
    .join('|');

  return `${menuItemId}::${modifierIds}::${notes.trim().toLowerCase()}`;
}

export function PublicOrderingExperience({
  restaurantId,
  restaurantName,
  accent,
  menu,
  locations,
}: PublicOrderingExperienceProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [checkout, setCheckout] = useState({
    type: 'TAKEOUT',
    locationId: locations[0]?.id || '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  const hasMenuItems = menu.some((category: any) => (category.items || []).length > 0);
  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );

  const addToCart = (item: any, modifiers: CartItem['modifiers'] = [], notes = '', quantity = 1) => {
    const modifierTotal = modifiers.reduce(
      (sum, modifier) => sum + Number(modifier.priceAdjustment || 0),
      0
    );
    const unitPrice = Number(item.basePrice || 0) + modifierTotal;
    const signature = getCartSignature(item.id, modifiers, notes);

    setCartItems((current) => {
      const existing = current.find((entry) => entry.signature === signature);

      if (existing) {
        return current.map((entry) =>
          entry.id === existing.id
            ? {
                ...entry,
                quantity: entry.quantity + quantity,
              }
            : entry
        );
      }

      return [
        ...current,
        {
          id: createCartItemId(),
          signature,
          menuItemId: item.id,
          name: item.name,
          description: item.description,
          quantity,
          unitPrice,
          modifiers,
          notes,
        },
      ];
    });

    setSubmittedOrder(null);
    toast.success(`${item.name} added to order`);
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    setCartItems((current) =>
      current.flatMap((item) =>
        item.id !== itemId
          ? [item]
          : quantity <= 0
            ? []
            : [{ ...item, quantity }]
      )
    );
  };

  const handleItemSelect = (item: any) => {
    if (item.modifierGroups?.length > 0) {
      setSelectedItem(item);
      return;
    }

    addToCart(item);
  };

  const handleModifierConfirm = (item: any, modifiers: any[], notes: string, quantity: number) => {
    addToCart(item, modifiers, notes, quantity);
    setSelectedItem(null);
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Add at least one item before placing the order');
      return;
    }

    if (!checkout.locationId) {
      toast.error('Choose a pickup location');
      return;
    }

    if (!checkout.customerName.trim()) {
      toast.error('Enter the customer name');
      return;
    }

    if (!checkout.customerPhone.trim() && !checkout.customerEmail.trim()) {
      toast.error('Add a phone number or email');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.createPublicOrder(restaurantId, {
        locationId: checkout.locationId,
        type: checkout.type,
        customerName: checkout.customerName.trim(),
        customerPhone: checkout.customerPhone.trim(),
        customerEmail: checkout.customerEmail.trim(),
        notes: checkout.notes.trim(),
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          modifiers: item.modifiers.map((modifier) => ({
            modifierId: modifier.modifierId,
          })),
          notes: item.notes || undefined,
        })),
      });

      setSubmittedOrder(response.data);
      setCartItems([]);
      setCheckout((current) => ({
        ...current,
        notes: '',
      }));
      toast.success('Order sent to the restaurant');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to place the order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="menu" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 max-w-3xl">
        <p className="section-kicker">Online ordering</p>
        <h3 className="mt-3 text-4xl font-black text-white">Guests can build an order right from the menu</h3>
        <p className="mt-4 text-base leading-8 text-slate-300">
          Browse the live menu, customize items, and send the order straight to {restaurantName}
          without leaving the public website.
        </p>
      </div>

      {!hasMenuItems ? (
        <div className="card p-6">
          <p className="text-lg font-semibold text-white">Online ordering is almost ready</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Add active menu items in the admin menu first, then guests will be able to order here.
          </p>
        </div>
      ) : locations.length === 0 ? (
        <div className="card p-6">
          <p className="text-lg font-semibold text-white">No active ordering location</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Add or activate at least one restaurant location before taking guest orders on the public site.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            {menu.map((category: any) => (
              <section key={category.id} className="card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-2xl font-black text-white">{category.name}</h4>
                    <p className="mt-2 text-sm text-slate-400">
                      {category.description || 'Fresh from the live operational menu.'}
                    </p>
                  </div>
                  {category.color && (
                    <span
                      className="h-4 w-4 rounded-full border border-white/10"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  {(category.items || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{item.name}</p>
                            {item.isPopular && (
                              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                                Popular
                              </span>
                            )}
                            {item.isFeatured && (
                              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100">
                                Featured
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm leading-7 text-slate-400">
                            {item.description || 'Description coming soon.'}
                          </p>

                          {item.modifierGroups?.length > 0 && (
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Customizable
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-3">
                          <p className="text-base font-black text-white">{formatCurrency(item.basePrice)}</p>
                          <button
                            type="button"
                            onClick={() => handleItemSelect(item)}
                            className="btn-primary min-h-[40px] px-4 py-2 text-xs"
                            style={{ backgroundColor: accent }}
                          >
                            {item.modifierGroups?.length > 0 ? 'Customize' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="glass-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker">Cart</p>
                  <h4 className="mt-2 text-2xl font-black text-white">Order summary</h4>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-200">
                  <ShoppingBagIcon className="h-5 w-5" />
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-slate-950/35 p-5 text-sm leading-7 text-slate-400">
                  Add items from the menu to start the order.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{item.name}</p>
                          {item.modifiers.length > 0 && (
                            <p className="mt-1 text-xs leading-6 text-slate-400">
                              {item.modifiers.map((modifier) => modifier.modifierName).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-1 text-xs leading-6 text-slate-500">{item.notes}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, 0)}
                          className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-red-300/30 hover:text-red-200"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="rounded-full border border-white/10 p-2 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="rounded-full border border-white/10 p-2 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-sm font-bold text-white">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {itemCount} item{itemCount === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">Taxes are calculated when the order is submitted.</p>
                </div>
                <p className="text-xl font-black text-white">{formatCurrency(subtotal)}</p>
              </div>
            </section>

            <section className="card p-6">
              <p className="section-kicker">Checkout</p>
              <h4 className="mt-2 text-2xl font-black text-white">Guest details</h4>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {['TAKEOUT', 'DELIVERY'].map((typeOption) => (
                    <button
                      key={typeOption}
                      type="button"
                      onClick={() => setCheckout((current) => ({ ...current, type: typeOption }))}
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-sm font-semibold transition-all',
                        checkout.type === typeOption
                          ? 'border-cyan-300/40 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
                      )}
                    >
                      {typeOption === 'TAKEOUT' ? 'Pickup' : 'Delivery'}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="label">Location</label>
                  <select
                    value={checkout.locationId}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, locationId: event.target.value }))
                    }
                    className="input w-full"
                  >
                    {locations.map((location: any) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Customer Name</label>
                  <input
                    value={checkout.customerName}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, customerName: event.target.value }))
                    }
                    className="input w-full"
                    placeholder="Taylor"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Phone</label>
                    <input
                      value={checkout.customerPhone}
                      onChange={(event) =>
                        setCheckout((current) => ({ ...current, customerPhone: event.target.value }))
                      }
                      className="input w-full"
                      placeholder="(555) 555-5555"
                    />
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input
                      value={checkout.customerEmail}
                      onChange={(event) =>
                        setCheckout((current) => ({ ...current, customerEmail: event.target.value }))
                      }
                      className="input w-full"
                      placeholder="guest@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Order Notes</label>
                  <textarea
                    value={checkout.notes}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={3}
                    className="input w-full resize-none"
                    placeholder="Pickup timing, apartment buzzer, allergy reminder..."
                  />
                </div>

                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={cartItems.length === 0 || isSubmitting}
                  className="btn-primary w-full"
                  style={{ backgroundColor: accent }}
                >
                  {isSubmitting ? 'Sending order...' : 'Place order'}
                </button>

                <p className="text-sm leading-7 text-slate-400">
                  Orders are sent directly into the restaurant workflow with the live menu and modifier data.
                </p>
              </div>
            </section>

            {submittedOrder && (
              <section className="soft-panel p-6">
                <p className="section-kicker">Order received</p>
                <h4 className="mt-2 text-2xl font-black text-white">
                  Reference #{String(submittedOrder.id || '').slice(-6).toUpperCase()}
                </h4>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {restaurantName} now has the order in its system. Total: {formatCurrency(submittedOrder.total)}.
                </p>
              </section>
            )}
          </aside>
        </div>
      )}

      {selectedItem && (
        <ModifierModal
          item={selectedItem}
          onConfirm={handleModifierConfirm}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </section>
  );
}
