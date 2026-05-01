'use client';

import type { ProductLabel } from '../types';

type ProductLabelValue = ProductLabel[keyof ProductLabel];

interface UseLabelManagementReturn {
  addLabel: () => void;
  removeLabel: (index: number) => void;
  updateLabel: (index: number, field: keyof ProductLabel, value: ProductLabelValue) => void;
}

export function useLabelManagement(
  labels: ProductLabel[],
  setLabels: (updater: (prev: ProductLabel[]) => ProductLabel[]) => void
): UseLabelManagementReturn {
  const addLabel = () => {
    const newLabel: ProductLabel = {
      type: 'text',
      value: '',
      position: 'top-left',
      color: null,
    };
    setLabels((prev) => [...prev, newLabel]);
  };

  const removeLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, field: keyof ProductLabel, value: ProductLabelValue) => {
    setLabels((prev) => {
      const newLabels = [...prev];
      newLabels[index] = { ...newLabels[index], [field]: value };
      return newLabels;
    });
  };

  return {
    addLabel,
    removeLabel,
    updateLabel,
  };
}


