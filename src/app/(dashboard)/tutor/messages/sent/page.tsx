'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SentView from '@/components/messages/SentView';
import { useAuthStore } from '@/store/authStore';

export default function TutorSentPage() {
  const user = useAuthStore(state => state.user);
  if (!user) return null;
  return (
    <DashboardLayout title="Sent Messages">
      <SentView userId={String(user.id)} userRole={user.role} />
    </DashboardLayout>
  );
}
