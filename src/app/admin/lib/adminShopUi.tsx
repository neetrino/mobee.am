'use client';

import {
  Button as ShopButton,
  Card as ShopCard,
  Input as ShopInput,
  type ButtonProps,
  type CardProps,
  type InputProps,
} from '@shop/ui';

export type { ButtonProps as AdminButtonProps, CardProps as AdminCardProps, InputProps as AdminInputProps };

export function Card(props: Omit<CardProps, 'adminChrome'>) {
  return <ShopCard adminChrome {...props} />;
}

export function Button(props: Omit<ButtonProps, 'adminChrome'>) {
  return <ShopButton adminChrome {...props} />;
}

export function Input(props: Omit<InputProps, 'adminChrome'>) {
  return <ShopInput adminChrome {...props} />;
}
