interface WelcomeScreenProps {
  onOpenRepo: () => void;
}

export function WelcomeScreen({ onOpenRepo }: WelcomeScreenProps) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-logo">🌹</div>
        <h1 className="welcome-title">GitRose</h1>
        <p className="welcome-subtitle">Un client git avec du caractère</p>
        <button className="welcome-cta" onClick={onOpenRepo}>
          Ouvrir un dépôt
        </button>
        <p className="welcome-hint">ou glisse un dossier ici</p>
      </div>
    </div>
  );
}
