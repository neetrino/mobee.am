export interface CartFlyFromRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CartFlyAnimationDetail {
  imageUrl: string;
  fromRect: CartFlyFromRect;
}

/** Optional context when invoking add-to-cart from UI with a visible product thumbnail. */
export interface CartFlyContext {
  imageUrl: string;
  flySourceEl: HTMLElement | null;
}
