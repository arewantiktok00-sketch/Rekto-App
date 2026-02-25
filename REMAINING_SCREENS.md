# Remaining Screens to Update (14 total)

## Profile Screens (6):
- TransactionHistory.tsx - hook ✓, need styles
- NotificationSettings.tsx - hook ✓, need styles
- PrivacySecurity.tsx - hook ✓, need styles
- LanguageSettings.tsx - hook ✓, need styles
- HelpSupport.tsx - hook ✓, need styles
- FAQ.tsx - hook ✓, need styles

## Main Screens (5):
- Invoice.tsx - need hook/styles
- InvoiceHistory.tsx - need hook/styles
- Links.tsx - need hook/styles
- Tutorial.tsx - need hook/styles
- Notifications.tsx - need hook/styles

## Owner Screens (1):
- OwnerNotifications.tsx - need hook/styles

## Legal Screens (2):
- Terms.tsx - need hook/styles
- Privacy.tsx - need hook/styles

## Pattern for each:
1. Add: `const { colors } = useTheme(); const styles = createStyles(colors);`
2. Convert: `const styles = StyleSheet.create({` → `const createStyles = (colors: any) => StyleSheet.create({`
3. Update color refs:
   - `colors.background` → `colors.background.DEFAULT`
   - `colors.card` → `colors.card.background`
   - `colors.foreground` → `colors.foreground.DEFAULT`
   - `colors.muted` → `colors.foreground.muted`
   - `colors.primary` → `colors.primary.DEFAULT`
   - `colors.border` → `colors.border.DEFAULT`
   - Icon colors: `colors.primary` → `colors.primary.DEFAULT`
