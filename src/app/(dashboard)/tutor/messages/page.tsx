import { redirect } from 'next/navigation';

export default function TutorMessagesRedirect() {
  redirect('/tutor/messages/inbox');
}
