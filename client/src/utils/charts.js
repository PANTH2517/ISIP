import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = '"Noto Sans", Inter, ui-sans-serif, system-ui, sans-serif';
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;

export const PALETTE = ['#1d4b94', '#f26b1d', '#138808', '#157a6e', '#5b82c4', '#ffad70', '#9333ea', '#0891b2', '#ca8a04', '#64748b'];

export const STATUS_COLORS = {
  draft: '#94a3b8', pending: '#f59e0b', approved: '#1d4b94', incubated: '#138808', rejected: '#dc2626',
  modification_requested: '#f26b1d',
};

export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};
