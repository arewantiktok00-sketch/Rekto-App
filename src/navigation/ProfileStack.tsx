import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Profile } from '@/screens/profile/Profile';
import { PersonalInfo } from '@/screens/profile/PersonalInfo';
import { WalletBalance } from '@/screens/profile/WalletBalance';
import { AddBalance } from '@/screens/profile/AddBalance';
import { PaymentMethods } from '@/screens/profile/PaymentMethods';
import { TransactionHistory } from '@/screens/profile/TransactionHistory';
import { BillingHistory } from '@/screens/profile/BillingHistory';
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
import { SettingsSupportHub } from '@/screens/profile/SettingsSupportHub';
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
      <Stack.Screen name="Profile" component={Profile} options={{ title: t('profile') }} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfo} options={{ title: t('personalInfo') }} />
      <Stack.Screen name="WalletBalance" component={WalletBalance} options={{ title: t('walletAndBalance') }} />
      <Stack.Screen name="AddBalance" component={AddBalance} options={{ title: t('addFunds') }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethods} options={{ title: t('paymentMethods') }} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistory} options={{ title: t('transactionHistory') }} />
      <Stack.Screen name="BillingHistory" component={BillingHistory} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ title: t('notificationSettings') }} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurity} options={{ title: t('privacySecurity') }} />
      <Stack.Screen name="ChangePasswordSendCode" component={ChangePasswordSendCode} />
      <Stack.Screen name="ChangePasswordOTP" component={ChangePasswordOTP} />
      <Stack.Screen name="ChangePasswordNewPassword" component={ChangePasswordNewPassword} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettings} options={{ title: t('languageSettings') }} />
      <Stack.Screen name="AppearanceSettings" component={AppearanceSettings} options={{ title: t('appearance') }} />
      <Stack.Screen name="HelpSupport" component={HelpSupport} options={{ title: t('helpSupport') }} />
      <Stack.Screen name="LegalDocuments" component={LegalDocuments} options={{ title: t('legalDocuments') }} />
      <Stack.Screen name="FAQ" component={FAQPage} options={{ title: t('faq') }} />
      <Stack.Screen name="SettingsSupportHub" component={SettingsSupportHub} options={{ title: t('support') }} />
    </Stack.Navigator>
  );
}
