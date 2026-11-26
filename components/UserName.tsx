import { BadgeCheck } from 'lucide-react';

export type UserBadge = {
  is_visible?: boolean;
  badge?: {
    id?: string;
    name: string;
    color: string;
    kind: 'school' | 'club';
  } | {
    id?: string;
    name: string;
    color: string;
    kind: 'school' | 'club';
  }[] | null;
};

const badgeColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-800',
};

export function UserName({
  name,
  badges = [],
  className = '',
  nameClassName = '',
}: {
  name: string;
  badges?: UserBadge[];
  className?: string;
  nameClassName?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 ${className}`}>
      <span className={nameClassName}>{name}</span>
      {badges
        .filter((entry) => entry.is_visible !== false && entry.badge)
        .flatMap((entry) => {
          const badge = Array.isArray(entry.badge) ? entry.badge[0] : entry.badge;
          if (!badge) return null;
          return (
            <span
              key={badge.id || `${badge.kind}:${badge.name}`}
              title={badge.kind === 'school' ? `School badge: ${badge.name}` : `Club badge: ${badge.name}`}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${badgeColors[badge.color] || badgeColors.blue}`}
            >
              <BadgeCheck aria-hidden="true" className="h-3 w-3" />
              {badge.name}
            </span>
          );
        })}
    </span>
  );
}
