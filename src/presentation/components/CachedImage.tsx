import { ImgHTMLAttributes, useEffect, useState } from 'react';

const loadedImages = new Set<string>();

export const CachedImage = ({
  src,
  fetchPriority,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) => {
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(src);
      return;
    }

    if (loadedImages.has(src)) {
      setDisplaySrc(src);
      return;
    }

    let isMounted = true;
    const image = new Image();
    image.src = src;
    image.onload = () => {
      loadedImages.add(src);
      if (isMounted) {
        setDisplaySrc(src);
      }
    };
    image.onerror = () => {
      if (isMounted) {
        setDisplaySrc(src);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!displaySrc) {
    return null;
  }

  const imageProps = {
    ...props,
    fetchpriority: fetchPriority ?? 'auto',
  } as ImgHTMLAttributes<HTMLImageElement> & { fetchpriority: string };

  return (
    <img
      src={displaySrc}
      decoding={props.decoding ?? 'async'}
      loading={props.loading ?? 'lazy'}
      {...imageProps}
    />
  );
};
