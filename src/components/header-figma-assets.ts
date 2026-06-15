import { HEADER_PHONE_ICON_SRC } from '../lib/constants/ui-icons.constants';

/**
 * Header bar static assets (local `public/` — avoid expiring remote MCP URLs).
 */
export const HEADER_FIGMA_ASSETS = {
  phoneIcon: HEADER_PHONE_ICON_SRC,
} as const;
