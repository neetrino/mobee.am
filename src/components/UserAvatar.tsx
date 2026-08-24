'use client';

import { DEFAULT_USER_AVATAR_SRC } from './user-avatar.constants';

/**
 * UserAvatar Component
 *
 * Displays a user avatar image with a default profile picture fallback.
 */
interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_SIZE_CLASS: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'size-10',
  md: 'size-16',
  lg: 'size-20',
  xl: 'size-32',
};

export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const displayName = `${firstName || ''} ${lastName || ''}`.trim();
  const isDefaultAvatar = !avatarUrl;
  const sizeClass = AVATAR_SIZE_CLASS[size];

  return (
    <div
      className={`relative flex-none overflow-hidden rounded-full bg-white aspect-square ${sizeClass} ${className}`.trim()}
    >
      <img
        src={avatarUrl || DEFAULT_USER_AVATAR_SRC}
        alt={displayName || 'User avatar'}
        className={`block h-full w-full ${isDefaultAvatar ? 'object-contain' : 'object-cover'}`}
      />
    </div>
  );
}
