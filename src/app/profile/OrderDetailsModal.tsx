'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@shop/ui';
import { formatPriceInCurrency, convertPrice, type CurrencyCode } from '../../lib/currency';
import { resolveOrderShippingMethodKind } from '../../lib/order-shipping-method-label';
import { useAnimatedModalDismiss } from '../../lib/useAnimatedModalDismiss';
import { PROFILE_PILL_BUTTON_CLASS } from './profileUi.constants';
import { getStatusColor, getPaymentStatusColor, getColorValue } from './utils';
import type { OrderDetails } from './types';

interface OrderDetailsModalProps {
  selectedOrder: OrderDetails | null;
  orderDetailsLoading: boolean;
  orderDetailsError: string | null;
  isReordering: boolean;
  currency: CurrencyCode;
  onClose: () => void;
  onReOrder: () => void;
  t: (key: string) => string;
}

export function OrderDetailsModal({
  selectedOrder,
  orderDetailsLoading,
  orderDetailsError,
  isReordering,
  currency,
  onClose,
  onReOrder,
  t,
}: OrderDetailsModalProps) {
  const [orderSnapshot, setOrderSnapshot] = useState<OrderDetails | null>(selectedOrder);
  const isOpen = selectedOrder !== null;

  useEffect(() => {
    if (selectedOrder) {
      setOrderSnapshot(selectedOrder);
    }
  }, [selectedOrder]);

  const {
    isVisible,
    requestClose,
    handlePanelAnimationEnd,
    backdropMotionClass,
    panelMotionClass,
  } = useAnimatedModalDismiss({
    isOpen,
    onClose,
    lockBodyScroll: true,
    panelMotionVariant: 'dialog',
  });

  const getAttributeLabel = (key: string): string => {
    if (key === 'color' || key === 'colour') return t('profile.orderDetails.color');
    if (key === 'size') return t('profile.orderDetails.size');
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const getColorsArray = (colors: any): string[] => {
    if (!colors) return [];
    if (Array.isArray(colors)) return colors;
    if (typeof colors === 'string') {
      try {
        const parsed = JSON.parse(colors);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  if (!isVisible || !orderSnapshot) {
    return null;
  }

  const selectedOrderData = orderSnapshot;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <button
        type="button"
        className={`fixed inset-0 bg-gray-500/75 ${backdropMotionClass}`}
        aria-label={t('profile.orderDetails.close')}
        onClick={requestClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[15px] bg-white shadow-xl ${panelMotionClass}`}
          onClick={(event) => event.stopPropagation()}
          onAnimationEnd={handlePanelAnimationEnd}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('profile.orderDetails.title')}{selectedOrderData.number}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('profile.orderDetails.placedOn')} {new Date(selectedOrderData.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={onReOrder}
                disabled={isReordering}
                variant="primary"
                size="sm"
                className={PROFILE_PILL_BUTTON_CLASS}
              >
                {isReordering ? t('profile.orderDetails.adding') : t('profile.orderDetails.reorder')}
              </Button>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-admin-50 hover:text-admin-600 focus:outline-none focus:ring-2 focus:ring-admin-400 focus:ring-offset-2"
                aria-label={t('profile.orderDetails.close')}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {orderDetailsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('profile.orderDetails.loading')}</p>
              </div>
            ) : orderDetailsError ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{orderDetailsError}</p>
                <Button onClick={requestClose} variant="outline" className={PROFILE_PILL_BUTTON_CLASS}>
                  {t('profile.orderDetails.close')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Status */}
                  <Card className="rounded-[15px] p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.orderDetails.orderStatus')}</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrderData.status)}`}>
                        {selectedOrderData.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(selectedOrderData.paymentStatus)}`}>
                        {t('profile.orderDetails.payment')}: {selectedOrderData.paymentStatus}
                      </span>
                    </div>
                  </Card>

                  {/* Order Items */}
                  <Card className="rounded-[15px] p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.orderDetails.orderItems')}</h3>
                    <div className="space-y-4">
                      {selectedOrderData.items.map((item, index) => {
                        const allOptions = item.variantOptions || [];
                        
                        return (
                          <div key={index} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                            {item.imageUrl && (
                              <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-[15px] bg-gray-100">
                                <img
                                  src={item.imageUrl}
                                  alt={item.productTitle}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900 mb-1">{item.productTitle}</h4>
                              
                              {/* Display all variation options */}
                              {allOptions.length > 0 && (
                                <div className="flex flex-wrap gap-3 mt-2 mb-2">
                                  {allOptions.map((opt, optIndex) => {
                                    if (!opt.attributeKey || !opt.value) return null;
                                    
                                    const attributeKey = opt.attributeKey.toLowerCase().trim();
                                    const isColor = attributeKey === 'color' || attributeKey === 'colour';
                                    const displayLabel = opt.label || opt.value;
                                    const hasImage = opt.imageUrl && opt.imageUrl.trim() !== '';
                                    const colors = getColorsArray(opt.colors);
                                    const colorHex = colors.length > 0 ? colors[0] : (isColor ? getColorValue(opt.value) : null);
                                    
                                    return (
                                      <div key={optIndex} className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">
                                          {getAttributeLabel(opt.attributeKey)}:
                                        </span>
                                        <div className="flex items-center gap-2">
                                          {hasImage ? (
                                            <img
                                              src={opt.imageUrl!}
                                              alt={displayLabel}
                                              className="h-6 w-6 rounded border border-gray-300 object-cover"
                                              loading="lazy"
                                              decoding="async"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                              }}
                                            />
                                          ) : isColor && colorHex ? (
                                            <div 
                                              className="w-5 h-5 rounded-full border border-gray-300"
                                              style={{ backgroundColor: colorHex }}
                                              title={displayLabel}
                                            />
                                          ) : null}
                                          <span className="text-sm text-gray-900 capitalize">
                                            {displayLabel}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              <p className="text-sm text-gray-600">{t('profile.orderDetails.sku')}: {item.sku}</p>
                              <p className="text-sm text-gray-600 mt-2">
                                {t('profile.orderDetails.quantity')}: {item.quantity} × {(() => {
                                  const priceAMD = convertPrice(item.price, 'USD', 'AMD');
                                  const priceDisplay = currency === 'AMD' ? priceAMD : convertPrice(priceAMD, 'AMD', currency);
                                  return formatPriceInCurrency(priceDisplay, currency);
                                })()} = {(() => {
                                  const totalAMD = convertPrice(item.total, 'USD', 'AMD');
                                  const totalDisplay = currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency);
                                  return formatPriceInCurrency(totalDisplay, currency);
                                })()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Order Summary + Shipping */}
                <div className="space-y-4">
                  <Card className="sticky top-4 rounded-[15px] p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('profile.orderDetails.orderSummary')}</h3>
                    <div className="space-y-4 mb-6">
                      {selectedOrderData.totals ? (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>{t('profile.orderDetails.subtotal')}</span>
                            <span>
                              {(() => {
                                const subtotalAMD = convertPrice(selectedOrderData.totals.subtotal, 'USD', 'AMD');
                                const subtotalDisplay = currency === 'AMD' ? subtotalAMD : convertPrice(subtotalAMD, 'AMD', currency);
                                return formatPriceInCurrency(subtotalDisplay, currency);
                              })()}
                            </span>
                          </div>
                          {selectedOrderData.totals.discount > 0 && (
                            <div className="flex justify-between text-gray-600">
                              <span>{t('profile.orderDetails.discount')}</span>
                              <span>
                                -{(() => {
                                  const discountAMD = convertPrice(selectedOrderData.totals.discount, 'USD', 'AMD');
                                  const discountDisplay = currency === 'AMD' ? discountAMD : convertPrice(discountAMD, 'AMD', currency);
                                  return formatPriceInCurrency(discountDisplay, currency);
                                })()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-600">
                            <span>{t('profile.orderDetails.shipping')}</span>
                            <span>
                              {resolveOrderShippingMethodKind(selectedOrderData.shippingMethod) ===
                              'pickup'
                                ? t('checkout.shipping.freePickup')
                                : (() => {
                                    const shippingAMD = selectedOrderData.totals.shipping;
                                    const shippingDisplay = currency === 'AMD' ? shippingAMD : convertPrice(shippingAMD, 'AMD', currency);
                                    return formatPriceInCurrency(shippingDisplay, currency) + (selectedOrderData.shippingAddress?.city ? ` (${selectedOrderData.shippingAddress.city})` : '');
                                  })()}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>{t('profile.orderDetails.tax')}</span>
                            <span>
                              {(() => {
                                const taxAMD = convertPrice(selectedOrderData.totals.tax, 'USD', 'AMD');
                                const taxDisplay = currency === 'AMD' ? taxAMD : convertPrice(taxAMD, 'AMD', currency);
                                return formatPriceInCurrency(taxDisplay, currency);
                              })()}
                            </span>
                          </div>
                          <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between text-lg font-bold text-gray-900">
                              <span>{t('profile.orderDetails.total')}</span>
                              <span>
                                {(() => {
                                  const subtotalAMD = convertPrice(selectedOrderData.totals.subtotal, 'USD', 'AMD');
                                  const discountAMD = convertPrice(selectedOrderData.totals.discount, 'USD', 'AMD');
                                  const shippingAMD = selectedOrderData.totals.shipping;
                                  const taxAMD = convertPrice(selectedOrderData.totals.tax, 'USD', 'AMD');
                                  const totalAMD = subtotalAMD - discountAMD + shippingAMD + taxAMD;
                                  const totalDisplay = currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency);
                                  return formatPriceInCurrency(totalDisplay, currency);
                                })()}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-600">{t('profile.orderDetails.loadingTotals')}</div>
                      )}
                    </div>
                  </Card>

                  {/* Shipping Method */}
                  <Card className="rounded-[15px] p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.orderDetails.shippingMethod')}</h3>
                    <div className="text-gray-700 space-y-3">
                      <div>
                        <span className="font-medium">{t('profile.orderDetails.method')}: </span>
                        <span>
                          {(() => {
                            const kind = resolveOrderShippingMethodKind(
                              selectedOrderData.shippingMethod,
                            );
                            if (kind === 'delivery') {
                              return t('checkout.shipping.delivery');
                            }
                            if (kind === 'pickup') {
                              return t('checkout.shipping.storePickup');
                            }
                            return (
                              selectedOrderData.shippingMethod ||
                              t('profile.orderDetails.notSpecified')
                            );
                          })()}
                        </span>
                      </div>
                      {resolveOrderShippingMethodKind(selectedOrderData.shippingMethod) ===
                        'delivery' && selectedOrderData.shippingAddress && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="font-medium text-gray-900 mb-2">{t('profile.orderDetails.deliveryAddress')}:</p>
                          <div className="text-gray-600">
                            {selectedOrderData.shippingAddress.firstName && selectedOrderData.shippingAddress.lastName && (
                              <p>{selectedOrderData.shippingAddress.firstName} {selectedOrderData.shippingAddress.lastName}</p>
                            )}
                            {selectedOrderData.shippingAddress.addressLine1 && <p>{selectedOrderData.shippingAddress.addressLine1}</p>}
                            {selectedOrderData.shippingAddress.addressLine2 && <p>{selectedOrderData.shippingAddress.addressLine2}</p>}
                            {selectedOrderData.shippingAddress.city && (
                              <p>
                                {selectedOrderData.shippingAddress.city}
                                {selectedOrderData.shippingAddress.postalCode && `, ${selectedOrderData.shippingAddress.postalCode}`}
                              </p>
                            )}
                            {selectedOrderData.shippingAddress.countryCode && <p>{selectedOrderData.shippingAddress.countryCode}</p>}
                            {selectedOrderData.shippingAddress.phone && <p className="mt-2">{t('profile.orderDetails.phone')}: {selectedOrderData.shippingAddress.phone}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



