import * as React from 'react';

export const IconTopicManagement = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 18v-6" />
    <path d="M9 15h6" />
  </svg>
);

export const IconMcqBank = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconQuestionBank = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v10.5" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 13H4" />
      <path d="M8 17H4" />
      <path d="M6 13L2 17" />
    </svg>
  );

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        {...props}
    >
        <rect x="10" y="10" width="180" height="180" rx="20" fill="#f5f5f5" stroke="#1e3a8a" strokeWidth="4"/>
        <polygon points="100,40 130,80 70,80" fill="#fbbf24"/>
        <polygon points="100,60 120,100 80,100" fill="#fbbf24"/>
        <polygon points="100,80 110,120 90,120" fill="#fbbf24"/>
        <path d="M70 130 L90 150 L130 100" stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="50%" y="190" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="28" fill="#1e3a8a">tnpsc<tspan fill="#ef4444">99</tspan></text>
    </svg>
);
