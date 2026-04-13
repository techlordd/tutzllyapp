import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  image?: string;
  className?: string;
}

const sizeMap = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };

const colors = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500'
];

export default function Avatar({ name, size = 'md', image, className }: AvatarProps) {
  const colorIndex = name.charCodeAt(0) % colors.length;
  if (image) {
    return (
      <img src={image} alt={name} className={cn('rounded-full object-cover flex-shrink-0', sizeMap[size], className)} />
    );
  }
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', sizeMap[size], colors[colorIndex], className)}>
      {getInitials(name)}
    </div>
  );
}
