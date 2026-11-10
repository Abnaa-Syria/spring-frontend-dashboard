import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import type { ReactNode } from 'react';

export type Tone = 'blue' | 'teal' | 'green' | 'orange' | 'red' | 'purple';

export const TONES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: 'var(--tone-blue-bg)', fg: 'var(--tone-blue-fg)' },
  teal: { bg: 'var(--tone-teal-bg)', fg: 'var(--tone-teal-fg)' },
  green: { bg: 'var(--tone-green-bg)', fg: 'var(--tone-green-fg)' },
  orange: { bg: 'var(--tone-orange-bg)', fg: 'var(--tone-orange-fg)' },
  red: { bg: 'var(--tone-red-bg)', fg: 'var(--tone-red-fg)' },
  purple: { bg: 'var(--tone-purple-bg)', fg: 'var(--tone-purple-fg)' },
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
            <div className="kpi-delta" style={{ color: delta == null ? 'var(--c-subtle)' : delta >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
              {delta != null && (
                <>
                  {delta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} <bdi dir="ltr">{Math.abs(delta).toFixed(0)}%</bdi>{' '}
                </>
              )}
              <span style={{ color: 'var(--c-subtle)', fontWeight: 500 }}>{hint}</span>
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
