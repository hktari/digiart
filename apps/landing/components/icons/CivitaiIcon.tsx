interface CivitaiIconProps {
  size?: number;
  className?: string;
}

const CivitaiIcon: React.FC<CivitaiIconProps> = ({ size = 20, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id="civitaiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <path
      fill="url(#civitaiGradient)"
      d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
    />
    <path fill="#fff" d="M9 12l-2 2 2 2 4-4-4-4zm6 0l2-2-2-2-4 4 4 4z" />
  </svg>
);

export default CivitaiIcon;
