import { ArrowUpRight, Facebook, MapPin, UserRound, Users, UsersRound } from 'lucide-react';

const sessions = [
  { players: '1 on 1', format: 'Private coaching', rate: 600, icon: UserRound },
  { players: '2–3 players', format: 'Small group coaching', rate: 500, icon: Users },
  { players: '4–8 players', format: 'Group coaching', rate: 400, icon: UsersRound },
];

export default function Pricing() {
  return (
    <section id="pricing" className="pricing-section section-space" aria-labelledby="pricing-title">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark-eyebrow">SESSION PRICING</p>
            <h2 id="pricing-title">Your court.<br /><em>Your kind of session.</em></h2>
          </div>
          <p>Train one on one or bring your playing partners.<br className="desktop-break" /> All rates are per hour, per player.</p>
        </div>
        <div className="pricing-grid">
          {sessions.map(({ players, format, rate, icon: Icon }) => (
            <article className="pricing-card" key={players}>
              <div className="pricing-card-top"><Icon size={28} aria-hidden="true" /><span>{format}</span></div>
              <h3>{players}</h3>
              <p className="session-price"><span>₱</span>{rate}</p>
              <p className="price-unit">per hour / per player</p>
            </article>
          ))}
        </div>
        <div className="pricing-location">
          <MapPin size={23} aria-hidden="true" />
          <div><p><strong>Players provide the court location.</strong></p><p>Prices vary depending on the location. Message me with your court location, group size, and preferred schedule to confirm your final rate.</p></div>
        </div>
        <div className="pricing-actions">
          <a className="button button-dark" href="https://www.facebook.com/CoachJeremyPickleball" target="_blank" rel="noopener noreferrer"><Facebook size={18} aria-hidden="true" /> Message my Facebook Page <ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
