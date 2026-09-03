'use client';

import { useState } from 'react';
import { useTranslation } from '../../../lib/i18n-client';
import {
  TREND_ORDERS_COLOR,
  TREND_REVENUE_COLOR,
  dayNumberFromIso,
  defaultFormatCurrency,
  formatAxisAmount,
  formatPointLabel,
  niceCeiling,
  shouldShowDayLabel,
  xForIndex,
} from './lineChart.utils';

export { TREND_ORDERS_COLOR, TREND_REVENUE_COLOR } from './lineChart.utils';

export interface TrendChartPoint {
  _id: string;
  count: number;
  revenue: number;
}

export interface TrendChartTooltipCopy {
  revenueLabel: string;
  ordersLabel: string;
  formatRevenue: (amount: number) => string;
  formatOrders: (count: number) => string;
}

interface LineChartProps {
  data: TrendChartPoint[];
  currency?: string;
  chartAria?: string;
  tooltip?: TrendChartTooltipCopy;
}

/**
 * Grill-style dual trend chart: revenue line + orders bars, hover tooltip on dots.
 */
export function LineChart({
  data,
  currency = 'AMD',
  chartAria,
  tooltip,
}: LineChartProps) {
  const { t } = useTranslation();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  const resolvedTooltip: TrendChartTooltipCopy = tooltip ?? {
    revenueLabel: t('admin.dashboard.chartRevenue'),
    ordersLabel: t('admin.dashboard.chartOrders'),
    formatRevenue: (amount) => defaultFormatCurrency(amount, currency),
    formatOrders: (count) => String(count),
  };

  const width = 720;
  const height = 236;
  const padding = { top: 16, right: 44, bottom: 36, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const pointCount = Math.max(data.length, 1);
  const slotWidth = plotWidth / pointCount;

  const maxRevenue = niceCeiling(Math.max(...data.map((point) => point.revenue), 1));
  const maxOrders = niceCeiling(Math.max(...data.map((point) => point.count), 1));

  const revenuePoints = data.map((point, index) => {
    const x = xForIndex(index, data.length, padding.left, plotWidth);
    const y = padding.top + plotHeight - (point.revenue / maxRevenue) * plotHeight;
    return { x, y, point, index };
  });

  const linePath = revenuePoints
    .map(
      (entry, index) =>
        `${index === 0 ? 'M' : 'L'} ${entry.x.toFixed(1)} ${entry.y.toFixed(1)}`,
    )
    .join(' ');
  const lastX = revenuePoints[revenuePoints.length - 1]?.x ?? padding.left;
  const firstX = revenuePoints[0]?.x ?? padding.left;
  const areaPath = `${linePath} L ${lastX} ${padding.top + plotHeight} L ${firstX} ${padding.top + plotHeight} Z`;
  const barWidth = Math.min(22, Math.max(6, slotWidth * 0.5));

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    revenue: Math.round(maxRevenue * ratio),
    orders: Math.round(maxOrders * ratio),
  }));

  const hovered = revenuePoints.find((entry) => entry.point._id === hoveredKey);

  return (
    <div
      className="relative mx-auto w-full max-w-4xl"
      onMouseLeave={() => {
        setHoveredKey(null);
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-56 w-full sm:h-64"
        role="img"
        aria-label={chartAria ?? t('admin.dashboard.chartTitle')}
      >
        <defs>
          <linearGradient id="mobeeTrendRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TREND_REVENUE_COLOR} stopOpacity="0.28" />
            <stop offset="100%" stopColor={TREND_REVENUE_COLOR} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = padding.top + plotHeight - tick.ratio * plotHeight;
          return (
            <g key={tick.ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E5E7EB"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#9CA3AF" fontSize="10">
                {formatAxisAmount(tick.revenue)}
              </text>
              <text
                x={width - padding.right + 8}
                y={y + 3}
                textAnchor="start"
                fill="#9CA3AF"
                fontSize="10"
              >
                {tick.orders}
              </text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const x = xForIndex(index, data.length, padding.left, plotWidth);
          const barHeight = (point.count / maxOrders) * plotHeight;
          const y = padding.top + plotHeight - barHeight;
          const active = point._id === hoveredKey;
          return (
            <rect
              key={`bar-${point._id}`}
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, point.count > 0 ? 2 : 0)}
              rx={5}
              fill={TREND_ORDERS_COLOR}
              opacity={active ? 1 : 0.85}
            />
          );
        })}

        <path d={areaPath} fill="url(#mobeeTrendRevenueFill)" />
        <path
          d={linePath}
          fill="none"
          stroke={TREND_REVENUE_COLOR}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hovered ? (
          <line
            x1={hovered.x}
            y1={padding.top}
            x2={hovered.x}
            y2={padding.top + plotHeight}
            stroke="#D1D5DB"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        ) : null}

        {revenuePoints.map((entry) => {
          const active = entry.point._id === hoveredKey;
          return (
            <circle
              key={`dot-${entry.point._id}`}
              cx={entry.x}
              cy={entry.y}
              r={active ? 6 : 4}
              fill={TREND_REVENUE_COLOR}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        {revenuePoints.map((entry) => (
          <rect
            key={`hit-${entry.point._id}`}
            x={entry.x - slotWidth / 2}
            y={padding.top}
            width={slotWidth}
            height={plotHeight}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => {
              setHoveredKey(entry.point._id);
            }}
          />
        ))}

        {revenuePoints.map((entry) => {
          if (!shouldShowDayLabel(entry.index, data.length)) {
            return null;
          }
          return (
            <text
              key={`tick-${entry.point._id}`}
              x={entry.x}
              y={height - 14}
              textAnchor="middle"
              fill="#6B7280"
              fontSize="10"
            >
              {dayNumberFromIso(entry.point._id)}
            </text>
          );
        })}
      </svg>

      {hovered ? (
        <div
          className={`pointer-events-none absolute z-10 min-w-[10.5rem] -translate-x-1/2 rounded-xl bg-white px-3 py-2.5 shadow-lg ring-1 ring-black/5 ${
            hovered.y < 72 ? 'translate-y-3' : '-translate-y-[calc(100%+10px)]'
          }`}
          style={{
            left: `${Math.min(88, Math.max(12, (hovered.x / width) * 100))}%`,
            top: `${(hovered.y / height) * 100}%`,
          }}
          role="tooltip"
        >
          <p className="text-xs font-semibold text-gray-900">
            {formatPointLabel(hovered.point._id)}
          </p>
          <div className="mt-1.5 space-y-1 text-[11px] leading-snug text-gray-600">
            <p className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: TREND_REVENUE_COLOR }}
                aria-hidden
              />
              <span>
                {resolvedTooltip.revenueLabel}:{' '}
                <span className="font-semibold text-gray-900">
                  {resolvedTooltip.formatRevenue(hovered.point.revenue)}
                </span>
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: TREND_ORDERS_COLOR }}
                aria-hidden
              />
              <span>
                {resolvedTooltip.ordersLabel}:{' '}
                <span className="font-semibold text-gray-900">
                  {resolvedTooltip.formatOrders(hovered.point.count)}
                </span>
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
