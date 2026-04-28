export const BALANCE_PASSCODE = '3887';
export const MAINTENANCE_PASSCODE = '3887';
export const WHATSAPP_COST_PER_MESSAGE = 1;
export const WHATSAPP_PAYMENT_UPI = '9499473347';
export const WHATSAPP_PAYMENT_PHONE = '919499473347';
export const MAINTENANCE_CYCLE_DAYS = 60;

export function addDays(dateLike, days) {
  const baseDate = new Date(dateLike);
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function formatDateForInput(dateLike) {
  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetween(startDateLike, endDateLike = new Date()) {
  const startDate = new Date(startDateLike);
  const endDate = new Date(endDateLike);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const normalizedStartDate = new Date(startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);

  const normalizedEndDate = new Date(endDate);
  normalizedEndDate.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((normalizedEndDate - normalizedStartDate) / (1000 * 60 * 60 * 24)),
  );
}

export function getMaintenanceMetrics(lastMaintenanceDateLike, now = new Date()) {
  const lastMaintenanceDate = lastMaintenanceDateLike ? new Date(lastMaintenanceDateLike) : null;
  const hasValidLastMaintenanceDate = lastMaintenanceDate && !Number.isNaN(lastMaintenanceDate.getTime());
  const effectiveLastMaintenanceDate = hasValidLastMaintenanceDate ? lastMaintenanceDate : null;
  const daysSinceMaintenance = effectiveLastMaintenanceDate
    ? daysBetween(effectiveLastMaintenanceDate, now)
    : MAINTENANCE_CYCLE_DAYS;
  const percent = Math.min(
    100,
    Math.round((daysSinceMaintenance / MAINTENANCE_CYCLE_DAYS) * 100),
  );
  const nextMaintenanceDate = effectiveLastMaintenanceDate
    ? addDays(effectiveLastMaintenanceDate, MAINTENANCE_CYCLE_DAYS)
    : null;
  const daysUntilDue = nextMaintenanceDate
    ? Math.max(0, MAINTENANCE_CYCLE_DAYS - daysSinceMaintenance)
    : 0;
  const overdueDays = Math.max(0, daysSinceMaintenance - MAINTENANCE_CYCLE_DAYS);

  return {
    daysSinceMaintenance,
    daysUntilDue,
    overdueDays,
    nextMaintenanceDate,
    percent,
    isDue: !effectiveLastMaintenanceDate || daysSinceMaintenance >= MAINTENANCE_CYCLE_DAYS,
  };
}

export function getMaintenanceColor(percent) {
  if (percent <= 50) {
    return '#16A34A';
  }

  if (percent <= 80) {
    return '#D97706';
  }

  return '#DC2626';
}

export function getWhatsAppBalanceColor(balance) {
  if (balance > 50) {
    return '#16A34A';
  }

  if (balance >= 10) {
    return '#D97706';
  }

  return '#DC2626';
}
