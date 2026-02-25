# Typography Update Guide for All Screens

## Screens Updated ✅
- ✅ Profile.tsx
- ✅ Dashboard.tsx
- ✅ FAQ.tsx
- ✅ LinkEditor.tsx
- ✅ Tutorial.tsx
- ✅ OwnerDashboard.tsx

## Remaining Screens to Update

### Profile Screens
- [ ] PersonalInfo.tsx
- [ ] WalletBalance.tsx
- [ ] PaymentMethods.tsx
- [ ] TransactionHistory.tsx
- [ ] NotificationSettings.tsx
- [ ] PrivacySecurity.tsx
- [ ] LanguageSettings.tsx
- [ ] AppearanceSettings.tsx
- [ ] HelpSupport.tsx

### Main Screens
- [ ] Campaigns.tsx
- [ ] CreateAd.tsx
- [ ] CampaignDetail.tsx
- [ ] Links.tsx
- [ ] Invoice.tsx
- [ ] InvoiceHistory.tsx
- [ ] Analytics.tsx
- [ ] Notifications.tsx
- [ ] PaymentSuccess.tsx

### Auth Screens
- [ ] Login.tsx
- [ ] SignUp.tsx
- [ ] PhoneLogin.tsx
- [ ] PhoneSignUp.tsx
- [ ] ForgotPassword.tsx
- [ ] ResetPassword.tsx
- [ ] VerifyCode.tsx
- [ ] VerifyEmail.tsx

### Other Screens
- [ ] Index.tsx
- [ ] NotFound.tsx
- [ ] Terms.tsx
- [ ] Privacy.tsx
- [ ] OwnerNotifications.tsx

## How to Update Each Screen

1. **Import typography:**
```tsx
import { getTypographyStyles } from '@/theme/typography';
```

2. **Get typography in component:**
```tsx
const { language } = useLanguage();
const typography = getTypographyStyles(language as 'en' | 'ckb' | 'ar');
```

3. **Update createStyles to accept typography:**
```tsx
const createStyles = (colors: any, insets: any, typography: any) => StyleSheet.create({
```

4. **Apply typography to all Text styles:**
```tsx
headerTitle: {
  ...typography.h3,
  fontSize: 18,
  color: colors.foreground.DEFAULT,
},
bodyText: {
  ...typography.body,
  fontSize: 16,
  color: colors.foreground.DEFAULT,
},
```

## Typography Variants
- `h1` - Large headings (24px)
- `h2` - Medium headings (20px)
- `h3` - Small headings (18px)
- `body` - Body text (16px)
- `bodySmall` - Small body text (14px)
- `label` - Labels (14px, medium weight)
- `caption` - Captions (12px)
