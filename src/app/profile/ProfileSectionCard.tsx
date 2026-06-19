import type { ReactNode } from 'react';
import { Card } from '@shop/ui';

type ProfileSectionCardProps = {
  embeddedInSheet?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Profile section shell — bordered card on desktop; plain block inside mobile modal
 * (modal panel already provides the outer frame).
 */
export function ProfileSectionCard({
  embeddedInSheet = false,
  className = '',
  children,
}: ProfileSectionCardProps) {
  if (embeddedInSheet) {
    return <div className={`w-full ${className}`.trim()}>{children}</div>;
  }

  return <Card className={`rounded-[15px] p-6 ${className}`.trim()}>{children}</Card>;
}
