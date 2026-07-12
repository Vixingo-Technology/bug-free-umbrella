export function getAgeYears(dob: Date, now: Date = new Date()): number {
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

export function validateMinAge(
    isoDate: string | null | undefined,
    minAge: number
): string | null {
    if (!isoDate || !isoDate.trim()) return "Date of birth is required.";
    const dob = new Date(isoDate);
    if (isNaN(dob.getTime())) return "Please enter a valid date of birth.";
    const now = new Date();
    if (dob > now) return "Date of birth cannot be in the future.";
    const age = getAgeYears(dob, now);
    if (age < minAge) {
        return `You must be at least ${minAge} years old.`;
    }
    return null;
}

/** Latest ISO yyyy-mm-dd allowed as DOB for someone at least `minAge` years old today. */
export function maxDobForAge(minAge: number, now: Date = new Date()): string {
    const d = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
    return d.toISOString().split("T")[0];
}
