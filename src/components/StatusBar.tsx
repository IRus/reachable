interface Props {
  readonly text: string;
  readonly tone: "ok" | "warn" | "busy";
}

export function StatusBar({text, tone}: Props) {
  return (
    <p className={`status status--${tone}`} role="status">
      {text}
    </p>
  );
}
