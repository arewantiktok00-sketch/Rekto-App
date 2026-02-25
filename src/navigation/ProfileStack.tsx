import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Profile } from '@/screens/profile/Profile';
import { PersonalInfo } from '@/screens/profile/PersonalInfo';
import { WalletBalance } from '@/screens/profile/WalletBalance';
import { PaymentMethods } from '@/screens/profile/PaymentMethods';
import { TransactionHistory } from '@/screens/profile/TransactionHistory';
import { NotificationSettings } from '@/screens/profile/NotificationSettings';
import { PrivacySecurity } from '@/screens/profile/PrivacySecurity';
import { ChangePasswordSendCode } from '@/screens/profile/ChangePasswordSendCode';
import { ChangePasswordOTP } from '@/screens/profile/ChangePasswordOTP';
import { ChangePasswordNewPassword } from '@/screens/profile/ChangePasswordNewPassword';
import { LanguageSettings } from '@/screens/profile/LanguageSettings';
import { AppearanceSettings } from '@/screens/profile/AppearanceSettings';
import { HelpSupport } from '@/screens/profile/HelpSupport';
import { LegalDocuments } from '@/screens/profile/LegalDocuments';
import { FAQPage } from '@/screens/profile/FAQ';
import { useLanguage } from '@/contexts/LanguageContext';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  const { t } = useLanguage();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Profile" component={Profile} options={{ title: t('profile') || 'Profile' }} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfo} options={{ title: t('personalInfo') || 'Personal Information' }} />
      <Stack.Screen name="WalletBalance" component={WalletBalance} options={{ title: t('walletAndBalance') || 'Wallet & Balance' }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethods} options={{ title: t('paymentMethods') || 'Payment Methods' }} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistory} options={{ title: t('transactionHistory') || 'Transaction History' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ title: t('notificationSettings') || 'Notification Settings' }} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurity} options={{ title: t('privacySecurity') || 'Privacy & Security' }} />
      <Stack.Screen name="ChangePasswordSendCode" component={ChangePasswordSendCode} />
      <Stack.Screen name="ChangePasswordOTP" component={ChangePasswordOTP} />
      <Stack.Screen name="ChangePasswordNewPassword" component={ChangePasswordNewPassword} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettings} options={{ title: t('languageSettings') || 'Language Settings' }} />
      <Stack.Screen name="AppearanceSettings" component={AppearanceSettings} options={{ title: t('appearance') || 'Appearance' }} />
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ title: t('helpSupport') || 'Help & Support' }} />
      <Stack.Screen name="LegalDocuments" component={LegalDocuments} options={{ title: t('legalDocuments') || 'Legal Documents' }} />
      <Stack.Screen name="FAQ" component={FAQPage} options={{ title: t('faq') || 'FAQ' }} />
    </Stack.Navigator>
  );
}
