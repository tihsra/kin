import Link from 'next/link';
import { Icon } from '@/components/icon';

export default function Home() {
  return (
    <main className="campaign">
      <svg className="print-effects" aria-hidden="true">
        <defs>
          <filter id="rough-ink">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.055"
              numOctaves="2"
              seed="12"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <section className="campaign-opening" aria-labelledby="campaign-title">
        <div className="opening-caption">
          <span>A COMMUNITY BLOOD DONOR NETWORK</span>
          <span>GOOD PEOPLE. REAL CONNECTIONS.</span>
        </div>
        <div className="opening-landscape">
          <img
            className="community-photograph"
            src="/images/kin-community.webp"
            alt="Illustrative photograph of two people connecting on a neighbourhood street"
            fetchPriority="high"
            width="1536"
            height="1024"
          />
        </div>
        <div className="campaign-title">
          <p>Strangers, until someone needs a hand.</p>
          <h1 id="campaign-title">
            GOOD
            <br />
            <span>BLOOD.</span>
          </h1>
          <p className="opening-intro">
            A community that helps willing donors and people looking for help find each other.
          </p>
          <div className="button-row">
            <Link className="button dark" href="/register">
              Become a donor
              <Icon name="diagonal" size={18} />
            </Link>
            <Link className="editorial-link" href="/discover">
              Find a request
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        </div>
        <div className="opening-bottom">
          <span>01 / THE HUMAN CONNECTION</span>
          <a href="#the-connection" aria-label="Scroll to the human connection">
            <span>SCROLL TO DISCOVER</span>
            <Icon name="arrow" size={18} />
          </a>
          <span>YOUR TIME. YOUR TERMS.</span>
        </div>
      </section>

      <section
        className="connection-chapter"
        id="the-connection"
        aria-labelledby="connection-title"
      >
        <div className="chapter-caption">
          <span>01 / THE HUMAN CONNECTION</span>
          <span>IT STARTS WITH US.</span>
        </div>
        <div className="connection-layout">
          <h2 id="connection-title">
            NOBODY
            <br />
            SHOULD
            <br />
            SEARCH
            <br />
            <span>ALONE.</span>
          </h2>
          <div className="connection-copy">
            <p className="chapter-lead">
              Behind a blood request is a person.
              <br />
              On the other side, there could be you.
            </p>
            <p>
              Kin helps willing donors and people looking for help find each other. A collection
              location. A time that works. An arrangement everyone understands.
            </p>
            <p>Your hospital confirms what’s needed. You decide how you can help.</p>
            <Link className="editorial-link" href="/discover">
              See where you could help <Icon name="diagonal" size={20} />
            </Link>
          </div>
        </div>
        <div className="connection-footnote">
          <span>LESS CALLING AROUND.</span>
          <span>MORE KNOWING WHAT COMES NEXT.</span>
        </div>
      </section>

      <section className="field-chapter" id="your-terms" aria-labelledby="field-title">
        <div className="field-content">
          <span className="eyebrow">02 / ON YOUR TERMS</span>
          <h2 id="field-title">
            A LITTLE
            <br />
            OF YOUR
            <br />
            <span>DAY.</span>
          </h2>
        </div>
        <div className="field-copy">
          <p className="chapter-lead">
            Some days, nearby.
            <br />
            Other days, a little farther.
          </p>
          <p>
            You might be free today. You might travel farther tomorrow. Every request is a fresh
            choice about your time and travel.
          </p>
          <p>
            Choose the invitations you receive. Offer when the destination and timing work. Pause
            whenever you need to.
          </p>
          <Link className="editorial-link" href="/register">
            Choose to be a donor
            <Icon name="diagonal" size={20} />
          </Link>
        </div>
      </section>

      <section className="field-notes" aria-label="How the network works">
        <span className="eyebrow">A FEW THINGS WE BELIEVE IN.</span>
        <div className="field-note">
          <span>01</span>
          <h3>
            Your number
            <br />
            is yours.
          </h3>
          <p>
            Contact details stay private until you choose to share them with a confirmed
            participant.
          </p>
        </div>
        <div className="field-note">
          <span>02</span>
          <h3>
            An offer.
            <br />
            Then a plan.
          </h3>
          <p>Offer an arrival window. Wait for confirmation. Know where to go before you travel.</p>
        </div>
        <div className="field-note">
          <span>03</span>
          <h3>
            Plans change.
            <br />
            Help continues.
          </h3>
          <p>If someone cancels, the request can reach other donors. Nobody has to start over.</p>
        </div>
      </section>

      <section className="take-part" id="take-part" aria-labelledby="take-part-title">
        <div className="chapter-caption">
          <span>03 / TAKE PART</span>
          <span>THERE’S A PERSON AT THE OTHER END.</span>
        </div>
        <h2 id="take-part-title">
          FIND YOUR
          <br />
          <span>PEOPLE.</span>
        </h2>
        <div className="take-part-bottom">
          <p>
            One account. Either side of the connection.
            <br />
            Start wherever you are.
          </p>
          <div className="participation-links">
            <Link href="/register">
              <span>I can be a donor</span>
              <Icon name="diagonal" size={28} />
            </Link>
            <Link href="/requests/new">
              <span>I’m looking for donors</span>
              <Icon name="diagonal" size={28} />
            </Link>
          </div>
        </div>
      </section>

      <aside className="collection-note">
        <span>THE PRACTICAL PART</span>
        <p>
          Kin coordinates people. Your hospital or blood centre confirms requirements, eligibility,
          and collection arrangements.
        </p>
        <a href="https://eraktkosh.mohfw.gov.in/" target="_blank" rel="noreferrer">
          Blood-bank stock on eRaktKosh <Icon name="diagonal" size={14} />
        </a>
      </aside>
    </main>
  );
}
