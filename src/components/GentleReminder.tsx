import { Icon } from './Icon'

export function GentleReminder() {
  return (
    <aside className="reflection" aria-label="A gentle reminder">
      <div className="reflection-art" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />
        <div className="art-sun" />
        <div className="art-horizon" />
        <span className="art-star star-one">✧</span>
        <span className="art-star star-two">✧</span>
      </div>
      <div className="reflection-copy">
        <p className="eyebrow">A GENTLE REMINDER</p>
        <h2>
          Make space <br />
          for what matters.
        </h2>
        <p>
          You don’t have to do it all.
          <br />
          Just the next meaningful thing.
        </p>
        <span className="reflection-rule" />
        <span className="reflection-signature">A calmer kind of productive.</span>
      </div>
      <div className="daily-note">
        <Icon name="leaf" size={17} />
        <span>Small steps still move you forward.</span>
      </div>
    </aside>
  )
}
