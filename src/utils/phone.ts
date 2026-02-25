/**
 * Phone Number Normalization Utility
 * Converts phone numbers to E.164 format (+9647501234567)
 * 
 * CRITICAL: All phone numbers MUST be normalized to E.164 format before API calls
 */

/**
 * Normalize phone number to E.164 format
 * @param phone - Phone number in any format
 * @param countryCode - Default country code (default: '+964' for Iraq)
 * @returns Normalized phone number in E.164 format (e.g., +9647501234567)
 * 
 * Examples:
 * - "07501234567" → "+9647501234567"
 * - "9647501234567" → "+9647501234567"
 * - "+9647501234567" → "+9647501234567"
 * - "00964750123456" → "+964750123456"
 */
export function normalizePhoneToE164(phone: string, countryCode: string = '+964'): string {
  if (!phone) return '';

  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading 0 (local format like 07501234567 → 7501234567)
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = cleaned.substring(1);
  }

  // Handle 00 prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // Add country code if missing
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('964')) {
      cleaned = '+' + cleaned;
    } else {
      const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
      cleaned = code + cleaned;
    }
  }

  return cleaned;
}

export function buildFullPhoneNumber(countryCode: string, localNumber: string): string {
  let cleaned = localNumber.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return code + cleaned;
}

/**
 * Format phone number for display (adds spaces for readability)
 * @param phone - Phone number in E.164 format
 * @returns Formatted phone number (e.g., +964 750 123 4567)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Format: +964 750 123 4567
  if (cleaned.startsWith('+964') && cleaned.length >= 13) {
    const digits = cleaned.substring(4); // Remove +964
    return `+964 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
  
  return phone;
}

/**
 * Check if email is a phone-based internal email
 * @param email - Email address to check
 * @returns true if email is phone-based (e.g., phone_9647501234567@rekto.phone)
 */
export function isPhoneBasedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.endsWith('@rekto.phone') || email.startsWith('phone_');
}
