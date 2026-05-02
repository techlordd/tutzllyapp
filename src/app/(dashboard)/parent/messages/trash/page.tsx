'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TrashView from '@/components/messages/TrashView';
import { useAuthStore } from '@/store/authStore';

export default function ParentTrashPage() {
  const user = useAuthStore(state => state.user);
  if (!user) return null;
  return (
    <DashboardLayout title="Trash">
      <TrashView userId={String(user.id)} userRole={user.role} />
    </DashboardLayout>
  );
}
