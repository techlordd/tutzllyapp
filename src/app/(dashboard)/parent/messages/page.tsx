import { redirect } from 'next/navigation';

export default function ParentMessagesRedirect() {
  redirect('/parent/messages/inbox');
}
