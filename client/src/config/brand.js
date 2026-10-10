/**
 * Product identity. Set VITE_SUPPORT_EMAIL in client/.env to change the contact address.
 */
export const BRAND = {
  name: 'StartIn',
  fullName: 'Intelligent Startup Incubation Platform',
  tagline: 'From idea to funded startup.',
  support: import.meta.env.VITE_SUPPORT_EMAIL || import.meta.env.VITE_HELPDESK_EMAIL || 'hello@startin.app',
};
