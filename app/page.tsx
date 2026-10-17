import { Text } from "@/components/translation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Sparkles,
  Check,
  ShieldCheck,
  Heart,
  MoveRight,
} from "lucide-react";
import { Brand, ThemeToggle, LanguageToggle } from "@/components/shell";
import { Button } from "@/components/ui";
export default function Home() {
  return (
    <div className="landing">
      <header className="public-nav">
        <Brand />
        <nav>
          <a href="#experience">
            <Text value="The experience" />
          </a>
          <Link href="/exams">
            <Text value="Explore exams" />
          </Link>
          <Link href="/games">
            <Text value="Brain Arcade" />
          </Link>
        </nav>
        <div className="row">
          <LanguageToggle />
          <ThemeToggle />
          <Button href="/login">
            <Text value="Start your journey" />
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="pill">
              <span className="tiny-dot" />
              <Text value="A fresh way to find your focus" />
            </div>
            <h1>
              <Text value="Study hard." />
              <br />
              <Text value="Play smart." />
              <br />
              <span>
                <Text value="Grow every day." />
              </span>
              <svg
                viewBox="0 0 400 20"
                className="underline"
                aria-hidden="true"
              >
                <path d="M5 14 Q190 -2 395 10" />
              </svg>
            </h1>
            <p>
              <Text value="Big dreams start with little steps. Prepare for your next exam, recharge with a brain game, and build a learning habit that feels like you." />
            </p>
            <div className="row hero-buttons">
              <Button href="/login">
                <Text value="Get started with Google" />
                <ArrowRight size={18} />
              </Button>
              <Button href="#experience" secondary>
                <Text value="Explore the experience" />
              </Button>
            </div>
            <div className="hero-trust">
              <span>
                <Check size={16} />
                <Text value="Free to explore" />
              </span>
              <span>
                <ShieldCheck size={16} />
                <Text value="Private by default" />
              </span>
              <span>
                <Heart size={16} />
                <Text value="Made for your pace" />
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustrated preview of the learning experience"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="float-spark">✦</span>
            <div className="illustration-book">
              <span>
                <Text value="YOUR NEXT" />
                <br />
                <strong>
                  <Text value="little" />
                  <br />
                  <Text value="breakthrough." />
                </strong>
              </span>
              <BookOpen size={78} strokeWidth={1} />
              <div className="book-lines">
                <Text value="LEARN · PLAY · GROW" />
              </div>
            </div>
            <div className="floating-card focus-card">
              <span className="icon-box teal">
                <BookOpen size={22} />
              </span>
              <div>
                <strong>
                  <Text value="A little more focus." />
                </strong>
                <small>
                  <Text value="One question at a time." />
                </small>
              </div>
              <Check size={18} />
            </div>
            <div className="floating-card play-card">
              <span>🧩</span>
              <div>
                <strong>
                  <Text value="A happier study break" />
                </strong>
                <small>
                  <Text value="Recharge in the Brain Arcade" />
                </small>
              </div>
            </div>
            <span className="art-doodle">✧</span>
            <div className="art-tag">
              <Text value="Progress over perfection. ↗" />
            </div>
          </div>
        </section>
        <div className="exam-ribbon">
          <span>
            <Text value="YOUR AMBITION, YOUR PATH" />
          </span>
          <strong>SSC</strong>
          <i>✦</i>
          <strong>
            <Text value="Railways" />
          </strong>
          <i>✦</i>
          <strong>UPSC</strong>
          <i>✦</i>
          <strong>
            <Text value="Banking" />
          </strong>
          <i>✦</i>
          <strong>
            <Text value="Teaching" />
          </strong>
          <i>✦</i>
          <strong>
            <Text value="Entrance exams" />
          </strong>
        </div>
        <section id="experience" className="experience-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                <Text value="A LITTLE BALANCE GOES A LONG WAY" />
              </span>
              <h2>
                <Text value="A space for every side of you." />
              </h2>
            </div>
            <p>
              <Text value="For the focused you. The curious you." />
              <br />
              <Text value="And the you who just needs a breather." />
            </p>
          </div>
          <div className="experience-grid">
            <Link href="/exams" className="experience-card purple">
              <span className="card-label">
                <Text value="01 / LEARN" />
              </span>
              <div className="mini-illustration">
                <BookOpen size={64} strokeWidth={1.3} />
                <span>✦</span>
              </div>
              <h3>
                <Text value="Your goals." />
                <br />
                <Text value="A clearer path." />
              </h3>
              <p>
                <Text value="Explore exams and practice authentic papers as verified collections become available." />
              </p>
              <span className="text-link">
                <Text value="Find your exam" />
                <ArrowUpRight size={18} />
              </span>
            </Link>
            <Link href="/games" className="experience-card peach">
              <span className="card-label">
                <Text value="02 / PLAY" />
              </span>
              <div className="mini-tiles">
                <span>✿</span>
                <span>✦</span>
                <span>✦</span>
                <span>✿</span>
              </div>
              <h3>
                <Text value="Take a break." />
                <br />
                <Text value="Keep your spark." />
              </h3>
              <p>
                <Text value="Flip a card, spot a pattern, or merge a number. A little play can refresh your day." />
              </p>
              <span className="text-link">
                <Text value="Enter Brain Arcade" />
                <ArrowUpRight size={18} />
              </span>
            </Link>
            <Link href="/progress" className="experience-card green">
              <span className="card-label">
                <Text value="03 / GROW" />
              </span>
              <div className="mini-chart">
                <i />
                <i />
                <i />
                <i />
                <i />
                <span>↗</span>
              </div>
              <h3>
                <Text value="Small steps." />
                <br />
                <Text value="Meaningful progress." />
              </h3>
              <p>
                <Text value="See what you’ve learned, find what needs practice, and celebrate your own journey." />
              </p>
              <span className="text-link">
                <Text value="Meet your dashboard" />
                <ArrowUpRight size={18} />
              </span>
            </Link>
          </div>
        </section>
        <section className="honesty-banner">
          <span className="icon-box">
            <ShieldCheck size={30} />
          </span>
          <div>
            <span className="eyebrow">
              <Text value="TRUST IS PART OF THE SYLLABUS" />
            </span>
            <h2>
              <Text value="Real papers. Clear sources. No made-up claims." />
            </h2>
            <p>
              <Text value="Every published question must pass provenance, permission, and human review. Our catalog is growing; verified collections will always show their actual availability." />
            </p>
          </div>
          <Link href="/exams">
            <Text value="Explore the directory" />
            <MoveRight size={20} />
          </Link>
        </section>
        <section className="landing-bottom">
          <div>
            <span className="eyebrow">
              <Text value="LEARNING THAT FITS YOUR LIFE" />
            </span>
            <h2>
              <Text value="Find your rhythm." />
              <br />
              <Text value="We’ll be right here." />
            </h2>
            <p>
              <Text value="Plan a small goal. Practice at your pace. Make room for a little joy." />
            </p>
            <Button href="/login">
              <Text value="Let’s get growing" />
              <Sparkles size={17} />
            </Button>
          </div>
          <div className="faq">
            <h3>
              <Text value="A few things you might be wondering" />
            </h3>
            {[
              [
                "Do I need to create a password?",
                "No. MindMitra uses Google sign-in only, with no extra passwords to remember.",
              ],
              [
                "Are all exam papers available?",
                "No. The directory lists supported examinations. Papers are made available only after their source, reuse rights, and content have been reviewed.",
              ],
              [
                "Can I try a brain game first?",
                "Absolutely. The Brain Arcade is open to explore. Sign in to save your game results to your account.",
              ],
              [
                "Will my progress be public?",
                "Your study activity and game history are private. There are no public leaderboards.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <span>
          <Text value="A little learning. A little play. A lot of possibility." />
        </span>
        <div>
          <Link href="/privacy">
            <Text value="Privacy" />
          </Link>
          <Link href="/terms">
            <Text value="Terms" />
          </Link>
          <a href="mailto:contact@example.com">
            <Text value="Contact (configure before launch)" />
          </a>
        </div>
      </footer>
    </div>
  );
}
