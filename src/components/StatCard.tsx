import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import type { ReactNode } from 'react';

export type Tone = 'blue' | 'teal' | 'green' | 'orange' | 'red' | 'purple';

export const TONES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: '#E8EFFA', fg: '#2E508F' },
  teal: { bg: '#E3F5F8', fg: '#1E8A9B' },
  green: { bg: '#E6F6EC', fg: '#12A150' },
  orange: { bg: '#FDF1E3', fg: '#C46A05' },
  red: { bg: '#FDECEC', fg: '#D92D20' },
  purple: { bg: '#F0EBFB', fg: '#6941C6' },
};

/** KPI tile: icon, label, big value and an optional trend line. */
export function StatCard({ icon, label, value, tone = 'blue', delta, hint, loading, onClick }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: Tone;
  /** Percent change vs. the comparison period; null hides it. */
  delta?: number | null;
  hint?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  const t = TONES[tone];
  return (
    <Card hoverable={!!onClick} onClick={onClick} styles={{ body: { padding: 18 } }} style={{ height: '100%' }}>
      <div className="kpi">
        <div className="kpi-icon" style={{ background: t.bg, color: t.fg }} aria-hidden>{icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="kpi-label">{label}</div>
          {loading ? <Skeleton.Input active size="small" style={{ marginTop: 6 }} /> : <div className="kpi-value">{value}</div>}
          {(delta != null || hint) && !loading && (
            <div className="kpi-delta" style={{ color: delta == null ? '#8A99AD' : delta >= 0 ? '#12A150' : '#D92D20' }}>
              {delta != null && (
                <>
                  {delta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} <bdi dir="ltr">{Math.abs(delta).toFixed(0)}%</bdi>{' '}
                </>
              )}
              <span style={{ color: '#8A99AD', fontWeight: 500 }}>{hint}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Percent change, or null when there is nothing to compare against. */
export const pctChange = (now?: number | null, before?: number | null) =>
  now == null || before == null || before === 0 ? null : ((now - before) / before) * 100;
