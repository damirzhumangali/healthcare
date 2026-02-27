type Props = {
  tone?: "ok" | "warn" | "danger";
  text: string;
};

export default function Badge({ tone = "ok", text }: Props) {
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" />
      {text}
    </span>
  );
}
