export function Monogram({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`monogram ${className}`}
      viewBox="0 0 100 76"
      role="img"
      aria-label="S and J"
    >
      <text
        x="9"
        y="57"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="65"
        fontWeight="400"
        fill="currentColor"
      >
        S
      </text>
      <text
        x="43"
        y="47"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="26"
        fill="currentColor"
      >
        &amp;
      </text>
      <text
        x="64"
        y="57"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="65"
        fontWeight="400"
        fill="currentColor"
      >
        J
      </text>
      <path d="M22 69h53" stroke="currentColor" strokeWidth=".6" />
    </svg>
  );
}
