'use client';

import { DEFAULT_USER_AVATAR_SRC } from './user-avatar.constants';

/**
 * UserAvatar Component
 * 
 * Displays a user avatar image with a default profile picture fallback.
 * 
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @param avatarUrl - Optional URL to user's avatar image
 * @param size - Size of the avatar (default: 'md')
 */
interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ 
  firstName, 
  lastName, 
  avatarUrl, 
  size = 'md',
  className = '' 
}: UserAvatarProps) {
  // Size classes (`lg` tuned for profile header — between `md` and old 96px)
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'h-20 w-20 text-xl',
    xl: 'w-32 h-32 text-3xl',
  };

  const displayName = `${firstName || ''} ${lastName || ''}`.trim();

  return (
    <div className={`relative flex-shrink-0 ${sizeClasses[size]} ${className}`}>
      <img
        src={avatarUrl || DEFAULT_USER_AVATAR_SRC}
        alt={displayName || 'User avatar'}
        className="h-full w-full rounded-full object-cover"
      />
    </div>
  );
}



