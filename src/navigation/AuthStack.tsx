import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Login } from '@/screens/auth/Login';
import { SignUp } from '@/screens/auth/SignUp';
import { PhoneLogin } from '@/screens/auth/PhoneLogin';
import { PhoneSignUp } from '@/screens/auth/PhoneSignUp';
import { VerifyCode } from '@/screens/auth/VerifyCode';
import { VerifyEmail } from '@/screens/auth/VerifyEmail';
import { ForgotPassword } from '@/screens/auth/ForgotPassword';
import { ForgotPasswordOTP } from '@/screens/auth/ForgotPasswordOTP';
import { ForgotPasswordNewPassword } from '@/screens/auth/ForgotPasswordNewPassword';
import { ForgotPasswordPhone } from '@/screens/auth/ForgotPasswordPhone';
import { ResetPassword } from '@/screens/auth/ResetPassword';
import { BlockedScreen } from '@/screens/auth/BlockedScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="PhoneLogin" component={PhoneLogin} />
      <Stack.Screen name="PhoneSignUp" component={PhoneSignUp} />
      <Stack.Screen name="VerifyCode" component={VerifyCode} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ForgotPasswordOTP" component={ForgotPasswordOTP} />
      <Stack.Screen name="ForgotPasswordNewPassword" component={ForgotPasswordNewPassword} />
      <Stack.Screen name="ForgotPasswordPhone" component={ForgotPasswordPhone} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen name="Blocked" component={BlockedScreen} />
    </Stack.Navigator>
  );
}
