import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

const variantMap = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export default function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
      variantMap[variant]
    )}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'warning', label: 'Inactive' },
    scheduled: { variant: 'info', label: 'Scheduled' },
    started: { variant: 'purple', label: 'In Progress' },
    ended: { variant: 'success', label: 'Completed' },
    missed: { variant: 'danger', label: 'Missed' },
    rescheduled: { variant: 'warning', label: 'Rescheduled' },
    draft: { variant: 'default', label: 'Draft' },
    published: { variant: 'success', label: 'Published' },
    unread: { variant: 'info', label: 'Unread' },
    read: { variant: 'default', label: 'Read' },
  };
  const config = map[status?.toLowerCase()] || { variant: 'default', label: status || '—' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
