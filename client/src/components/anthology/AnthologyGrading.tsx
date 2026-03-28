interface Props {
  genre?: string;
}

const GENRE_COPY: Record<string, { icon: string; title: string; subtitle: string }> = {
  gumshoe: {
    icon:     '🔍',
    title:    'Cross-Referencing the Evidence',
    subtitle: 'The detective lights another cigarette and considers your theory…',
  },
  fantasy: {
    icon:     '📜',
    title:    'Consulting the Arcane Indices',
    subtitle: 'The Inquisitor traces runes of logic across the parchment…',
  },
  scifi: {
    icon:     '🖥️',
    title:    'Running Inference Protocol',
    subtitle: 'AI forensic core cross-checking your hypothesis against the incident log…',
  },
  horror: {
    icon:     '🕯️',
    title:    'Weighing the Testimony',
    subtitle: "Something in the dark pauses to consider what you've said…",
  },
};

const DEFAULT_COPY = GENRE_COPY.gumshoe;

export default function AnthologyGrading({ genre }: Props) {
  const copy = (genre && GENRE_COPY[genre]) || DEFAULT_COPY;

  return (
    <div className="phase generating" aria-live="polite" aria-busy="true">
      <div className="generating-content">
        <span className="generating-icon" aria-hidden="true">{copy.icon}</span>
        <h2 className="generating-title">{copy.title}</h2>
        <p className="generating-subtitle">{copy.subtitle}</p>
        <div className="generating-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
