// Format Firestore timestamp to readable date string
export function formatDate(ts) {
 if (!ts) return '-';
 const date = ts.toDate ? ts.toDate() : new Date(ts);
 return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(ts) {
 if (!ts) return '-';
 const date = ts.toDate ? ts.toDate() : new Date(ts);
 return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatCurrency(amount) {
 if (!amount && amount !== 0) return 'Rs 0';
 return `Rs ${Number(amount).toLocaleString('en-IN')}`;
}

export function formatLakhs(amount) {
 if (!amount) return 'Rs 0L';
 return `Rs ${(amount / 100000).toFixed(1)}L`;
}

// Get initials from name
export function getInitials(name) {
 if (!name) return '??';
 return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
