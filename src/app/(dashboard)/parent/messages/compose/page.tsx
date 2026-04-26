'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ComposeView from '@/components/messages/ComposeView';
import { useAuthStore } from '@/store/authStore';

export default function ParentComposePage() {
  const user = useAuthStore(state => state.user);
  if (!user) return null;
  return (
    <DashboardLayout title="Compose Message">
      <ComposeView currentUser={user} sentUrl="/parent/messages/sent" />
    </DashboardLayout>
  );
}
