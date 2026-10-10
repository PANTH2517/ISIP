import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif';
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;

export const PALETTE = ['#6366f1', '#8b5cf6', '#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#a855f7'];

export const STATUS_COLORS = {
  draft: '#94a3b8', pending: '#f59e0b', approved: '#6366f1', incubated: '#10b981', rejected: '#dc2626',
  modification_requested: '#f97316',
};

export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};
