/**
 * OTPInput — 6 individual cells, LTR forced (for RTL layouts).
 * keyboardType: number-pad, auto-advance, backspace to previous, paste support.
 * Digits use Poppins font.
 */
import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { fonts } from '@/utils/fonts';

const CELL_COUNT = 6;

interface OTPInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  editable?: boolean;
  cellStyle?: object;
  containerStyle?: object;
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  editable = true,
  cellStyle,
  containerStyle,
}: OTPInputProps) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const setDigit = (index: number, digit: string) => {
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < CELL_COUNT - 1) {
      inputs.current[index + 1]?.focus();
    }
    const code = next.join('');
    if (code.length === CELL_COUNT && onComplete) {
      onComplete(code);
    }
  };

  const handleChangeText = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length > 1) {
      // Paste: split across cells
      const arr = digits.slice(0, CELL_COUNT).split('');
      const next = [...value];
      arr.forEach((d, i) => {
        if (index + i < CELL_COUNT) next[index + i] = d;
      });
      onChange(next);
      const lastIdx = Math.min(index + arr.length, CELL_COUNT - 1);
      inputs.current[lastIdx]?.focus();
      const code = next.join('');
      if (code.length === CELL_COUNT && onComplete) onComplete(code);
      return;
    }
    if (digits.length === 1) {
      setDigit(index, digits);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.row, containerStyle]}>
      {Array.from({ length: CELL_COUNT }).map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => { inputs.current[index] = el; }}
          value={value[index] ?? ''}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={index === 0 ? 6 : 1}
          editable={editable}
          style={[
            styles.cell,
            { fontFamily: fonts.regular },
            cellStyle,
          ]}
          selectTextOnFocus
          // Force LTR for digits (never reverse in RTL)
          writingDirection="ltr"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontSize: 22,
    color: '#FAFAFA',
    textAlign: 'center',
    paddingVertical: 0,
    // Ensure row is never reversed in RTL
    writingDirection: 'ltr',
  },
});
