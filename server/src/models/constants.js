export const CATEGORIES = ['Adventure', 'Honeymoon', 'Family', 'Luxury', 'Budget', 'Weekend Getaways'];
export const PACKAGE_STATUSES = ['draft', 'published', 'archived'];
export const DEPARTURE_STATUSES = ['open', 'closed', 'cancelled'];
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
export const PAYMENT_STATUSES = ['unpaid', 'paid_demo', 'refunded_demo'];
export const DEMO_PAYMENT_RESULTS = ['success_demo', 'failed_demo', 'refunded_demo'];
export const ROLES = ['customer', 'admin'];
export const MAX_TRAVELLERS = 12;

/** Unpaid bookings hold their seats for this long. */
export const HOLD_MINUTES = 15;
/** Demo policy: customers may cancel up to this many days before departure. */
export const CANCELLATION_CUTOFF_DAYS = 7;
