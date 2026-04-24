export const formatDate = (date) => {
  if (!date) return 'Not set';
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });
};

export const daysDiff = (date1, date2) => {
  const d1 = date1?.toDate ? date1.toDate() : new Date(date1);
  const d2 = date2?.toDate ? date2.toDate() : new Date(date2);
  const diff = d2 - d1;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
