interface WelcomeScreenProps {
  onOpenRepo: () => void;
}

export function WelcomeScreen({ onOpenRepo }: WelcomeScreenProps) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-logo">🌹</div>
        <h1 className="welcome-title">GitRose</h1>
        <p className="welcome-subtitle">A git client with personality</p>
        <button className="welcome-cta" onClick={onOpenRepo}>
          Open a repository
        </button>
        <p className="welcome-hint">or drag a folder here</p>
      </div>
    </div>
  );
}
