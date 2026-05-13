import { ImgHTMLAttributes, memo, useEffect, useMemo, useState } from 'react';

import {
  getStoreFaviconUrl,
  markStoreFaviconFailed,
  SYSTEM_FAVICON_FALLBACK,
} from '../utils/favicon';

interface StoreFaviconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  site?: string | null;
}

export const StoreFavicon = memo(({ site, alt = '', ...props }: StoreFaviconProps) => {
  const faviconSrc = useMemo(() => getStoreFaviconUrl(site), [site]);
  const [src, setSrc] = useState(faviconSrc);

  useEffect(() => {
    setSrc(faviconSrc);
  }, [faviconSrc]);

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      decoding={props.decoding ?? 'async'}
      loading={props.loading ?? 'lazy'}
      width={props.width ?? 32}
      height={props.height ?? 32}
      onError={(event) => {
        markStoreFaviconFailed(src);
        if (src !== SYSTEM_FAVICON_FALLBACK) {
          setSrc(SYSTEM_FAVICON_FALLBACK);
        }
        props.onError?.(event);
      }}
    />
  );
});

StoreFavicon.displayName = 'StoreFavicon';
