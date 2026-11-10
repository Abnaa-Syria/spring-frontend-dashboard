import { theme as antdTheme, type ThemeConfig } from 'antd';

/** Spring brand tokens (same palette as the mobile apps' Figma file). */
export const brand = {
  primary: '#2E508F',
  primaryDark: '#1D3D66',
  primaryDeep: '#16304F',
  accent: '#42B8C8',
  bg: '#F2F7FC',
  surface: '#FFFFFF',
  border: '#E6ECF3',
  text: '#1F2A37',
  textMuted: '#5B6B80',
  textSubtle: '#8A99AD',
  success: '#12A150',
  warning: '#D97706',
  danger: '#D92D20',
  info: '#2E7FC2',
} as const;

export interface Palette {
  primary: string; accent: string;
  bg: string; surface: string; elevated: string; fill: string; hover: string;
  border: string; borderSoft: string; borderStrong: string;
  text: string; muted: string; subtle: string;
  success: string; warning: string; danger: string; info: string;
  /** Chart grid lines and the hover cursor. */
  grid: string; cursor: string;
  sider: string;
}

/** Light keeps the original brand look; dark is a deep navy built from the same blues. */
export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    primary: brand.primary, accent: brand.accent,
    bg: brand.bg, surface: '#FFFFFF', elevated: '#FFFFFF', fill: '#F4F7FB', hover: '#F4F8FD',
    border: brand.border, borderSoft: '#EEF2F7', borderStrong: '#D9E1EB',
    text: brand.text, muted: brand.textMuted, subtle: brand.textSubtle,
    success: brand.success, warning: brand.warning, danger: brand.danger, info: brand.info,
    grid: '#EEF2F7', cursor: '#C7D3E3',
    sider: 'linear-gradient(180deg, #1D3D66 0%, #16304F 100%)',
  },
  dark: {
    primary: '#5287DD', accent: '#4FC3D2',
    bg: '#0B1220', surface: '#121B2B', elevated: '#18233A', fill: '#182336', hover: '#1B283D',
    border: '#24324A', borderSoft: '#1D2A3F', borderStrong: '#30405C',
    text: '#E4EBF4', muted: '#9BAABF', subtle: '#6F8098',
    success: '#34C27A', warning: '#F0A53A', danger: '#F06A5F', info: '#4E9EE6',
    grid: '#1F2C42', cursor: '#33445F',
    sider: 'linear-gradient(180deg, #111D31 0%, #0A1322 100%)',
  },
};

export function buildTheme(dark: boolean): ThemeConfig {
  const p = palettes[dark ? 'dark' : 'light'];
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorInfo: p.info,
      colorSuccess: p.success,
      colorWarning: p.warning,
      colorError: p.danger,
      colorLink: p.primary,
      colorText: p.text,
      colorTextSecondary: p.muted,
      colorTextTertiary: p.subtle,
      colorTextQuaternary: dark ? '#55657C' : '#B4C0CF',
      colorBorder: p.borderStrong,
      colorBorderSecondary: p.border,
      colorSplit: p.borderSoft,
      colorBgLayout: p.bg,
      colorBgContainer: p.surface,
      colorBgElevated: p.elevated,
      colorFillAlter: p.fill,
      ...(dark && { colorBgMask: 'rgba(3, 8, 18, 0.65)' }),
      borderRadius: 10,
      borderRadiusLG: 16,
      borderRadiusSM: 8,
      controlHeight: 38,
      fontSize: 14,
      fontFamily: "'Cairo', system-ui, -apple-system, 'Segoe UI', sans-serif",
      boxShadowTertiary: dark
        ? '0 1px 2px rgba(0, 0, 0, 0.3)'
        : '0 1px 2px rgba(16, 40, 80, 0.06), 0 1px 6px rgba(16, 40, 80, 0.04)',
      ...(dark && {
        boxShadowSecondary: '0 10px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
      }),
    },
    components: {
      Layout: { bodyBg: p.bg, headerBg: 'transparent', headerHeight: 64, headerPadding: '0 24px', siderBg: brand.primaryDeep },
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkPopupBg: dark ? '#111D31' : brand.primaryDeep,
        darkItemSelectedBg: 'rgba(255,255,255,0.14)',
        darkItemHoverBg: 'rgba(255,255,255,0.08)',
        darkItemColor: 'rgba(255,255,255,0.72)',
        darkItemSelectedColor: '#FFFFFF',
        darkGroupTitleColor: 'rgba(255,255,255,0.45)',
        itemHeight: 42,
        itemBorderRadius: 10,
        itemMarginInline: 10,
        groupTitleFontSize: 12,
      },
      Card: { headerFontSize: 16, headerHeight: 52, paddingLG: 20 },
      Table: {
        headerBg: dark ? '#162033' : '#F6F9FC',
        headerColor: p.muted,
        headerSplitColor: 'transparent',
        rowHoverBg: p.hover,
        borderColor: p.border,
        cellPaddingBlock: 12,
        headerBorderRadius: 12,
        ...(dark && { rowSelectedBg: '#1A2B47', rowSelectedHoverBg: '#1E3150', footerBg: '#162033' }),
      },
      Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
      Tabs: { titleFontSize: 15, horizontalItemGutter: 28 },
      Tag: { borderRadiusSM: 6 },
      Statistic: { contentFontSize: 26 },
      Drawer: { paddingLG: 24 },
      Segmented: dark
        ? { itemSelectedBg: '#26354F', trackBg: '#0F1828', itemColor: p.muted, itemHoverColor: p.text, itemSelectedColor: p.text }
        : { itemSelectedBg: '#FFFFFF', trackBg: '#EAF0F7' },
      ...(dark && {
        Input: { activeBg: p.surface, hoverBg: p.surface },
        Select: { optionSelectedBg: '#1E3150' },
        Popover: { colorBgElevated: p.elevated },
      }),
    },
  };
}
