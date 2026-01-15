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
    width="152"
    height="40"
    viewBox="0 0 152 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_1_2)">
      <path
        d="M5.19922 2.80078C3.87353 2.80078 2.79922 3.8751 2.79922 5.20078V34.8008C2.79922 36.1265 3.87353 37.2008 5.19922 37.2008H34.7992C36.1249 37.2008 37.1992 36.1265 37.1992 34.8008V5.20078C37.1992 3.8751 36.1249 2.80078 34.7992 2.80078H5.19922Z"
        stroke="#007BFF"
        strokeWidth="2"
      />
      <path
        d="M19.9998 8.40039C21.0362 8.40039 21.8797 9.24392 21.8797 10.2804V15.6804H18.1197V10.2804C18.1197 9.24392 18.9632 8.40039 19.9998 8.40039Z"
        fill="#FFC107"
      />
      <path d="M21.8797 15.6804H18.1197V19.4404H21.8797V15.6804Z" fill="#FFC107" />
      <path
        d="M25.6396 19.4404H14.3596L16.2396 23.2004H23.7596L25.6396 19.4404Z"
        fill="#FFC107"
      />
      <path
        d="M23.7596 23.2004H16.2396L14.3596 26.9604H25.6396L23.7596 23.2004Z"
        fill="#FFC107"
      />
      <path
        d="M25.6396 26.9604H14.3596L12.4796 30.7204H27.5196L25.6396 26.9604Z"
        fill="#FFC107"
      />
      <path
        d="M15.2797 19.4404L27.5197 31.6804L29.3997 29.8004L18.1197 18.5204L15.2797 19.4404Z"
        fill="#28A745"
      />
      <path
        d="M12.4796 22.2804L15.2797 19.4404L18.1197 18.5204L8.71963 27.9204L12.4796 22.2804Z"
        fill="#28A745"
      />
    </g>
    <text
      x="48"
      y="28"
      fontFamily="Inter, sans-serif"
      fontSize="24"
      fontWeight="bold"
      fill="#007BFF"
    >
      tnpsc
      <tspan fill="#FFC107">99</tspan>
    </text>
    <defs>
      <clipPath id="clip0_1_2">
        <rect width="40" height="40" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
