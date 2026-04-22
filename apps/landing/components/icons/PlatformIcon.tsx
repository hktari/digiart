import {
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaTiktok,
  FaFacebook,
  FaLinkedin,
  FaGithub,
  FaDiscord,
  FaTwitch,
  FaPinterest,
} from "react-icons/fa";
import CivitaiIcon from "./CivitaiIcon";

interface PlatformIconProps {
  platform: string;
  className?: string;
  size?: number;
}

export function PlatformIcon({
  platform,
  className,
  size = 16,
}: PlatformIconProps) {
  const iconClass = className || "";

  const iconMap: Record<
    string,
    React.ComponentType<{ size?: number; className?: string }>
  > = {
    instagram: FaInstagram,
    twitter: FaTwitter,
    x: FaTwitter,
    youtube: FaYoutube,
    tiktok: FaTiktok,
    facebook: FaFacebook,
    linkedin: FaLinkedin,
    github: FaGithub,
    discord: FaDiscord,
    twitch: FaTwitch,
    pinterest: FaPinterest,
    civitai: CivitaiIcon,
  };

  const normalizedPlatform = platform.toLowerCase();
  const IconComponent = iconMap[normalizedPlatform];

  if (IconComponent) {
    return <IconComponent size={size} className={iconClass} />;
  }

  // Default fallback icon
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={iconClass}
      width={size}
      height={size}
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

export default PlatformIcon;
