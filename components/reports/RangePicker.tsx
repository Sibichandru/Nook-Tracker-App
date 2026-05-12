import { SegmentedControl } from '@/components/ui/SegmentedControl';

export type RangeKey = '7d' | '30d' | '3m' | '6m' | '12m';

const OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '12m', label: '12m' },
];

export const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '12m': 365,
};

type RangePickerProps = {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
};

export function RangePicker({ value, onChange }: RangePickerProps) {
  return (
    <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />
  );
}
