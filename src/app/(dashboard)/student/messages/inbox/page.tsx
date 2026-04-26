'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InboxView from '@/components/messages/InboxView';
import { useAuthStore } from '@/store/authStore';

export default function StudentInboxPage() {
  const user = useAuthStore(state => state.user);
  if (!user) return null;
  return (
    <DashboardLayout title="Inbox">
      <InboxView
        fetchUrl={`/api/messages/student?recipient_id=${encodeURIComponent(user.user_id)}`}
        currentUser={user}
      />
    </DashboardLayout>
  );
}
