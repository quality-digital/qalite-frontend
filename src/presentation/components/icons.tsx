import { SVGProps } from 'react';

const baseProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
} as const;

const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
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

export const StorefrontIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M3 9h18" />
    <path d="M5 9V5h14v4" />
    <path d="m4 9 1.5 10.5c.1.9.86 1.5 1.76 1.5h9.48c.9 0 1.66-.6 1.76-1.5L20 9" />
    <path d="M10 13h4v8h-4z" />
  </svg>
);

export const UsersGroupIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const BarChartIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M3 3v18h18" />
    <path d="M8 17V9" />
    <path d="M13 17V5" />
    <path d="M18 17v-6" />
  </svg>
);

export const SparklesIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M10 2v4" />
    <path d="M10 18v4" />
    <path d="M4 10H0" />
    <path d="M20 10h-4" />
    <path d="M5.5 4.5 3 2" />
    <path d="m17 18 2.5 2.5" />
    <path d="m3 18 2.5-2.5" />
    <path d="m17 2 2.5 2.5" />
    <circle cx="10" cy="10" r="3" />
    <path d="m20 16 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
  </svg>
);

export const EyeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12s-4.5 7.5-10.5 7.5S1.5 12 1.5 12Z" />
    <path d="M12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
  </svg>
);

export const EyeSlashIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="m3 3 18 18" />
    <path d="M10.37 10.37A3 3 0 0 0 9 13.5a3 3 0 0 0 3.75 2.88" />
    <path d="M14.32 9.68A3 3 0 0 0 9.68 14.32" />
    <path d="M21 12s-3.5-6-9-6a9.45 9.45 0 0 0-3.5.69" />
    <path d="M3 12s3.5 6 9 6a9.45 9.45 0 0 0 3.5-.69" />
  </svg>
);

export const ActivityIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M22 12h-4l-3 9-4-18-3 9H2" />
  </svg>
);

export const FilterIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M3 5h18" />
    <path d="M7 12h10" />
    <path d="M11 19h2" />
  </svg>
);

export const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.83 2.83l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.83-2.83l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.83-2.83l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.83 2.83l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.1a1 1 0 0 0-.9.6Z" />
  </svg>
);

export const LinkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L10 5" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L14 19" />
  </svg>
);

export const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <rect x="4" y="4" width="11" height="11" rx="2" />
  </svg>
);

export const FileTextIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z" />
    <path d="M14 3v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </svg>
);

export const ArchiveIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M3 7h18" />
    <path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
    <path d="M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    <path d="M10 11h4" />
  </svg>
);

export const PencilIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M4 20h4l10-10-4-4L4 16v4Z" />
    <path d="m13 6 4 4" />
  </svg>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const BrowserstackIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...strokeProps} {...props}>
    <rect x="3" y="5" width="18" height="10" rx="2" />
    <path d="M7 9h10" />
    <path d="M5 19h14" />
    <path d="M9 15v4" />
    <path d="M15 15v4" />
  </svg>
);
