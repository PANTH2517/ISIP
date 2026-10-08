import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif';
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;

export const PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6', '#84cc16', '#64748b'];

export const STATUS_COLORS = {
  draft: '#94a3b8', pending: '#f59e0b', approved: '#10b981', incubated: '#8b5cf6', rejected: '#ef4444',
  modification_requested: '#f97316',
};

export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};
