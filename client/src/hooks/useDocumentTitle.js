import { useEffect } from 'react';

const BASE = 'HolidayHub';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Your Next Adventure Begins Here`;
  }, [title]);
}
