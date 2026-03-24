import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { CheckCircle, XOctagon, AlertTriangle, Info, X } from 'lucide-react-native';

const TOAST_COLORS = {
  success: {
    background: '#F0FDF4',
    border: '#BBF7D0',
    icon: '#16A34A',
    iconBg: '#DCFCE7',
    title: '#166534',
    description: '#15803D',
  },
  error: {
    background: '#FEF2F2',
    border: '#FECACA',
    icon: '#DC2626',
    iconBg: '#FEE2E2',
    title: '#991B1B',
    description: '#B91C1C',
  },
  warning: {
    background: '#FFFBEB',
    border: '#FDE68A',
    icon: '#D97706',
    iconBg: '#FEF3C7',
    title: '#92400E',
    description: '#B45309',
  },
  info: {
    background: '#EFF6FF',
    border: '#BFDBFE',
    icon: '#2563EB',
    iconBg: '#DBEAFE',
    title: '#1E40AF',
    description: '#1D4ED8',
  },
};

const ToastIcon = ({ type }: { type: string }) => {
  const size = 20;
  switch (type) {
    case 'success':
      return <CheckCircle size={size} color={TOAST_COLORS.success.icon} />;
    case 'error':
      return <XOctagon size={size} color={TOAST_COLORS.error.icon} />;
    case 'warning':
      return <AlertTriangle size={size} color={TOAST_COLORS.warning.icon} />;
    case 'info':
      return <Info size={size} color={TOAST_COLORS.info.icon} />;
    default:
      return null;
  }
};

export interface CustomToastProps {
  type: string;
  text1?: string;
  text2?: string;
  hide: () => void;
}

const CustomToast = ({ type, text1, text2, hide }: CustomToastProps) => {
  const colors = TOAST_COLORS[type as keyof typeof TOAST_COLORS] || TOAST_COLORS.info;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: colors.iconBg }]}>
        <ToastIcon type={type} />
      </View>

      <View style={styles.textContainer}>
        {text1 ? (
          <Text style={[styles.title, { color: colors.title }]}>{text1}</Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.description, { color: colors.description }]}>{text2}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => {
          hide?.();
          Toast.hide();
        }}
        style={styles.closeButton}
        hitSlop={12}
        activeOpacity={0.7}
      >
        <X size={16} color={colors.title} style={{ opacity: 0.5 }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '92%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Rabar_021',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Rabar_021',
    opacity: 0.9,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  closeButton: {
    padding: 8,
    zIndex: 10,
  },
});

export const toastConfig = {
  success: (props: CustomToastProps) => <CustomToast {...props} type="success" />,
  error: (props: CustomToastProps) => <CustomToast {...props} type="error" />,
  warning: (props: CustomToastProps) => <CustomToast {...props} type="warning" />,
  info: (props: CustomToastProps) => <CustomToast {...props} type="info" />,
};
