/** Custom line icons for the navbar actions (replace the lucide equivalents). */

export function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Cart</title>
      <path
        d="M11.25 6C11.25 7.24264 10.2427 8.25 9 8.25C7.75732 8.25 6.75 7.24264 6.75 6M3.5625 2.8125L2.8125 15.1875H15.1875L14.4375 2.8125H3.5625Z"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="16"
      viewBox="0 0 13 16"
      width="13"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Wishlist</title>
      <path
        d="M11.5254 14.525V0.650024H0.650391V14.525L6.08789 11.525L11.5254 14.525Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Search</title>
      <path
        d="M15 15L12.0949 12.0949M12.0949 12.0949C13.0789 11.1109 13.6875 9.7515 13.6875 8.25C13.6875 5.24696 11.2531 2.8125 8.25 2.8125C5.24696 2.8125 2.8125 5.24696 2.8125 8.25C2.8125 11.2531 5.24696 13.6875 8.25 13.6875C9.7515 13.6875 11.1109 13.0789 12.0949 12.0949Z"
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth="1.3"
      />
    </svg>
  );
}
