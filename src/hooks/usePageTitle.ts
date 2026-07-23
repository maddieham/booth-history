import { useEffect } from 'react';

const SITE_NAME = 'Newy Booth History';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
