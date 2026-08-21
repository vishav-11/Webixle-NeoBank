// CardModule/components/DatePickerModal.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

// Date picker for non-web platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {}
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void; // Returns YYYY-MM-DD format
  value?: string; // YYYY-MM-DD format
  title?: string;
  minDate?: Date;
  maxDate?: Date;
}

// Web Date Picker Component
function WebDatePicker({
  visible, value, onClose, onSelect, title, minDate, maxDate,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
}) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(value.getMonth());
  const [year, setYear] = useState(value.getFullYear());
  const [selected, setSelected] = useState(value);
  const [yearMode, setYearMode] = useState(false);

  const currentYear = new Date().getFullYear();
  const minYear = minDate ? minDate.getFullYear() : 1900;
  const maxYear = maxDate ? maxDate.getFullYear() : currentYear;

  if (!visible) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const isDisabled = (d: number) => {
    const dt = new Date(year, month, d);
    if (minDate && dt < minDate) return true;
    if (maxDate && dt > maxDate) return true;
    return false;
  };

  const cells: React.ReactNode[] = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    cells.push(<View key={`empty${i}`} style={WDP.cell} />);
  }
  
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = (
      selected.getDate() === d &&
      selected.getMonth() === month &&
      selected.getFullYear() === year
    );
    const disabled = isDisabled(d);
    
    cells.push(
      <TouchableOpacity
        key={d}
        style={[
          WDP.cell,
          isSelected && { backgroundColor: colors.primary, borderRadius: Radius.full },
        ]}
        onPress={() => !disabled && setSelected(new Date(year, month, d))}
        disabled={disabled}
      >
        <Text
          style={[
            WDP.dayText,
            {
              color: disabled
                ? colors.text3
                : isSelected
                ? '#fff'
                : colors.text,
            },
          ]}
        >
          {d}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal transparent visible animationType="fade">
      <Pressable
        style={[WDP.overlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          style={[WDP.box, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[WDP.header, { borderBottomColor: colors.border }]}>
            <Text style={[WDP.headerTitle, { color: colors.text }]}>
              {title || 'Select Date'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {yearMode ? (
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[
                    WDP.yearRow,
                    y === year && {
                      backgroundColor: colors.primaryDim,
                      borderRadius: Radius.md,
                    },
                  ]}
                  onPress={() => {
                    setYear(y);
                    setYearMode(false);
                  }}
                >
                  <Text
                    style={[
                      WDP.yearText,
                      {
                        color: y === year ? colors.primary : colors.text,
                        fontWeight: y === year ? '700' : '500',
                      },
                    ]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <>
              {/* Navigation */}
              <View style={WDP.navigation}>
                <TouchableOpacity
                  style={[WDP.navBtn, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    if (month === 0) {
                      setMonth(11);
                      setYear((y) => y - 1);
                    } else {
                      setMonth((m) => m - 1);
                    }
                  }}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.text2} />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setYearMode(true)} style={WDP.navCenter}>
                  <Text style={[WDP.navText, { color: colors.text }]}>
                    {MONTHS[month]} {year}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={colors.text3} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[WDP.navBtn, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    if (month === 11) {
                      setMonth(0);
                      setYear((y) => y + 1);
                    } else {
                      setMonth((m) => m + 1);
                    }
                  }}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.text2} />
                </TouchableOpacity>
              </View>

              {/* Week days */}
              <View style={WDP.weekRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <Text key={day} style={[WDP.weekText, { color: colors.text3 }]}>
                    {day}
                  </Text>
                ))}
              </View>
              
              {/* Calendar grid */}
              <View style={WDP.grid}>{cells}</View>
            </>
          )}

          {/* Footer */}
          <View style={[WDP.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[WDP.footerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[WDP.footerText, { color: colors.text2 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[WDP.footerBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                onSelect(selected);
                onClose();
              }}
            >
              <Text style={[WDP.footerText, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Main Date Picker Component
export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  value,
  title,
  minDate,
  maxDate,
}: Props) {
  const [tempDate, setTempDate] = useState<Date>(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  });

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      setTempDate(new Date(year, month - 1, day));
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelect = (date: Date) => {
    onSelect(formatDate(date));
  };

  // Web version
  if (Platform.OS === 'web') {
    return (
      <WebDatePicker
        visible={visible}
        value={tempDate}
        onClose={onClose}
        onSelect={handleSelect}
        title={title}
        minDate={minDate}
        maxDate={maxDate}
      />
    );
  }

  // iOS version
  if (Platform.OS === 'ios' && DateTimePicker) {
    return (
      <Modal transparent animationType="slide" visible={visible}>
        <View style={IOS.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
          />
          <View style={[IOS.sheet, { backgroundColor: '#fff' }]}>
            <View style={IOS.header}>
              <TouchableOpacity onPress={onClose}>
                <Text style={IOS.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={IOS.headerTitle}>{title || 'Select Date'}</Text>
              <TouchableOpacity
                onPress={() => {
                  handleSelect(tempDate);
                  onClose();
                }}
              >
                <Text style={IOS.done}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={(_: any, date?: Date) => date && setTempDate(date)}
              maximumDate={maxDate}
              minimumDate={minDate}
              style={{ height: 216 }}
            />
          </View>
        </View>
      </Modal>
    );
  }

  // Android version
  if (Platform.OS === 'android' && DateTimePicker) {
    return visible ? (
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="default"
        onChange={(_: any, date?: Date) => {
          onClose();
          if (date) handleSelect(date);
        }}
        maximumDate={maxDate}
        minimumDate={minDate}
      />
    ) : null;
  }

  return null;
}

// Styles
const WDP = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[4],
  },
  box: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[3],
  },
  navBtn: {
    padding: Spacing[2],
    borderRadius: Radius.md,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: Typography.base,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[3],
    marginBottom: Spacing[1],
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[3],
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  yearRow: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  yearText: {
    fontSize: Typography.base,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing[3],
    padding: Spacing[4],
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
});

const IOS = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: '#000',
  },
  cancel: {
    fontSize: Typography.base,
    color: '#007AFF',
  },
  done: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: '#007AFF',
  },
});