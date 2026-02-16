interface DepListClassificationBoxProps {
  text: string | null;
}

export function DepListClassificationBox({ text }: DepListClassificationBoxProps) {
  if (!text) return null;
  return <div className="dl-classification-box">{text}</div>;
}
