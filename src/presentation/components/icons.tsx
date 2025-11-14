import { SVGProps } from 'react';

const baseProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24'
} as const;

const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

export const ArrowLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M5 12h14" />
    <path d="M12 19 5 12l7-7" />
  </svg>
);

export const LogoutIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17 15 12 10 7" />
    <path d="M15 12H3" />
  </svg>
);

export const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="8" r="4" />
  </svg>
);

export const ThemeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 4V2" />
    <path d="m7.76 6.24-1.06-1.06" />
    <path d="M4 12H2" />
    <path d="m7.76 17.76-1.06 1.06" />
    <path d="M12 20v2" />
    <path d="m16.24 17.76 1.06 1.06" />
    <path d="M20 12h2" />
    <path d="m16.24 6.24 1.06-1.06" />
  </svg>
);
