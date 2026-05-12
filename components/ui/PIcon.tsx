/**
 * Port of the Paisa design's PIcon component to react-native-svg.
 *
 * Icons are stroke-only line icons sized for a 24×24 viewport. The Svg root
 * sets default `fill="none"` and `stroke={color}`; per-icon overrides for
 * filled shapes (`fun`, `upi`, `dot`, `tag`, `wallet`) pass `fill={color}` +
 * `stroke="none"` on their accent path.
 *
 * The full icon name union is exported so consumers get autocompletion and
 * compile errors for typos.
 */

import type { ReactElement } from 'react';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

export type PIconName =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'home'
  | 'bills'
  | 'fun'
  | 'health'
  | 'salary'
  | 'travel'
  | 'coffee'
  | 'card'
  | 'cash'
  | 'upi'
  | 'plus'
  | 'close'
  | 'chevron'
  | 'chevdown'
  | 'filter'
  | 'calendar'
  | 'search'
  | 'settings'
  | 'bell'
  | 'dot'
  | 'split'
  | 'repeat'
  | 'note'
  | 'check'
  | 'back'
  | 'tag'
  | 'wallet'
  | 'trend';

export const ALL_PICON_NAMES: PIconName[] = [
  'food',
  'transport',
  'shopping',
  'home',
  'bills',
  'fun',
  'health',
  'salary',
  'travel',
  'coffee',
  'card',
  'cash',
  'upi',
  'plus',
  'close',
  'chevron',
  'chevdown',
  'filter',
  'calendar',
  'search',
  'settings',
  'bell',
  'dot',
  'split',
  'repeat',
  'note',
  'check',
  'back',
  'tag',
  'wallet',
  'trend',
];

type PIconProps = {
  name: PIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function PIcon({
  name,
  size = 22,
  color = '#000',
  strokeWidth = 1.8,
}: PIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderPaths(name, color)}
    </Svg>
  );
}

function renderPaths(name: PIconName, color: string): ReactElement {
  switch (name) {
    case 'food':
      return (
        <>
          <Path d="M4 4v7a3 3 0 003 3v6" />
          <Path d="M7 4v7" />
          <Path d="M16 4c-2 2-2 5-2 6 0 2 1 3 2 3v7" />
        </>
      );
    case 'transport':
      return (
        <>
          <Rect x={4} y={6} width={16} height={11} rx={2} />
          <Circle cx={8} cy={18} r={1.5} />
          <Circle cx={16} cy={18} r={1.5} />
          <Path d="M4 12h16" />
        </>
      );
    case 'shopping':
      return (
        <>
          <Path d="M5 8h14l-1 12H6L5 8z" />
          <Path d="M9 8V6a3 3 0 016 0v2" />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="M3 11L12 4l9 7" />
          <Path d="M5 10v10h14V10" />
        </>
      );
    case 'bills':
      return (
        <>
          <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
          <Path d="M9 8h6M9 12h6M9 16h4" />
        </>
      );
    case 'fun':
      return (
        <>
          <Circle cx={12} cy={12} r={8} />
          <Path d="M9 10v4l3.5-2L9 10z" fill={color} stroke="none" />
        </>
      );
    case 'health':
      return <Path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />;
    case 'salary':
      return <Path d="M12 3v18M7 7h8a2.5 2.5 0 010 5H9a2.5 2.5 0 000 5h8" />;
    case 'travel':
      return <Path d="M3 17l18-7-6-4-2 3-6 1-4 4 3 2 2 4 2-2z" />;
    case 'coffee':
      return (
        <>
          <Path d="M5 8h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4V8z" />
          <Path d="M16 10h2a2 2 0 010 4h-2" />
          <Path d="M8 3v2M11 3v2" />
        </>
      );
    case 'card':
      return (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={2} />
          <Path d="M3 10h18" />
          <Path d="M7 15h4" />
        </>
      );
    case 'cash':
      return (
        <>
          <Rect x={3} y={7} width={18} height={11} rx={1.5} />
          <Circle cx={12} cy={12.5} r={2.5} />
        </>
      );
    case 'upi':
      return (
        <Path
          d="M7 3l-3 10h5l-2 8 10-13h-6l2-5z"
          fill={color}
          stroke="none"
        />
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" />;
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" />;
    case 'chevron':
      return <Path d="M9 6l6 6-6 6" />;
    case 'chevdown':
      return <Path d="M6 9l6 6 6-6" />;
    case 'filter':
      return <Path d="M4 5h16M7 12h10M10 19h4" />;
    case 'calendar':
      return (
        <>
          <Rect x={4} y={6} width={16} height={14} rx={1.5} />
          <Path d="M4 10h16M9 3v4M15 3v4" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={6} />
          <Path d="M20 20l-4-4" />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={3} />
          <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" />
          <Path d="M10 20a2 2 0 004 0" />
        </>
      );
    case 'dot':
      return <Circle cx={12} cy={12} r={3} fill={color} stroke="none" />;
    case 'split':
      return (
        <>
          <Circle cx={8} cy={8} r={3} />
          <Circle cx={16} cy={16} r={3} />
          <Path d="M8 11v4a2 2 0 002 2h3" />
        </>
      );
    case 'repeat':
      return <Path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2M18 4v4h-4M6 20v-4h4" />;
    case 'note':
      return (
        <>
          <Path d="M5 4h10l4 4v12H5z" />
          <Path d="M15 4v4h4" />
          <Path d="M8 12h8M8 16h6" />
        </>
      );
    case 'check':
      return <Path d="M5 12l4 4 10-10" />;
    case 'back':
      return <Path d="M15 6l-6 6 6 6" />;
    case 'tag':
      return (
        <>
          <Path d="M12 3H4v8l10 10 8-8L12 3z" />
          <Circle cx={8} cy={7} r={1.2} fill={color} stroke="none" />
        </>
      );
    case 'wallet':
      return (
        <>
          <Path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          <Path d="M3 7l2-3h12l2 3" />
          <Circle cx={17} cy={13.5} r={1.2} fill={color} stroke="none" />
        </>
      );
    case 'trend':
      return (
        <>
          <Path d="M3 17l6-6 4 4 8-9" />
          <Path d="M15 6h6v6" />
        </>
      );
  }
}
