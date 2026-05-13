import { ImgHTMLAttributes, memo, useEffect, useMemo, useState } from 'react';

import {
  getStoreFaviconCandidates,
  markStoreFaviconFailed,
  SYSTEM_FAVICON_FALLBACK,
} from '../utils/favicon';

interface StoreFaviconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  site?: string | null;
}

export const StoreFavicon = memo(({ site, alt = '', ...props }: StoreFaviconProps) => {
  const candidates = useMemo(() => getStoreFaviconCandidates(site), [site]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const src = candidates[candidateIndex] ?? SYSTEM_FAVICON_FALLBACK;

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
        setCandidateIndex((currentIndex) =>
          currentIndex < candidates.length - 1 ? currentIndex + 1 : currentIndex,
        );
        props.onError?.(event);
      }}
    />
  );
});

StoreFavicon.displayName = 'StoreFavicon';
