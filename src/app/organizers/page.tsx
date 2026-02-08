import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Event Organizers | Ziyawa',
  description: 'Discover trusted event organizers in South Africa through their events',
};

// Organizers are discovered through events, not a directory
// Redirect to events page
export default function OrganizersPage() {
  redirect('/ziwaphi');
}
