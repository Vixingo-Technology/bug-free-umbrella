export const PHONE_LENGTH = 11;

export function isValidPhone(value: string | null | undefined): boolean {
    if (!value) return false;
    const digits = value.replace(/\D/g, "");
    return digits.length === PHONE_LENGTH;
}

export function validatePhone(value: string | null | undefined): string | null {
    if (!value || !value.trim()) return "Phone number is required.";
    const digits = value.replace(/\D/g, "");
    if (!/^\d+$/.test(value.trim())) return "Phone number must contain only digits.";
    if (digits.length !== PHONE_LENGTH) return `Phone number must be exactly ${PHONE_LENGTH} digits.`;
    return null;
}
