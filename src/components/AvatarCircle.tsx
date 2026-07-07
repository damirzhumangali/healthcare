import { getInitials } from "../lib/avatar";

type AvatarCircleProps = {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

export default function AvatarCircle({
  name,
  src,
  size = 48,
  className = "",
  alt = "",
}: AvatarCircleProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`avatar-circle ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden={alt ? undefined : true}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="avatar-circle__image"
        />
      ) : (
        <span className="avatar-circle__fallback">{initials}</span>
      )}
    </div>
  );
}

