/**
 * Portal identity. Set VITE_INSTITUTE_NAME / VITE_HELPDESK_EMAIL in client/.env to brand it for your institute.
 * The portal uses a civic design language but is not affiliated with any government body.
 */
export const BRAND = {
  name: 'StartIn',
  fullName: 'Intelligent Startup Incubation Platform',
  cell: 'Incubation & Innovation Cell',
  institute: import.meta.env.VITE_INSTITUTE_NAME || 'Institute Innovation Council',
  helpdesk: import.meta.env.VITE_HELPDESK_EMAIL || 'incubation@isip.edu',
  hours: 'Mon–Fri, 9:30 am – 5:30 pm',
};
