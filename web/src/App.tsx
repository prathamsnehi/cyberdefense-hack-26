import { Closing, Footer } from "./sections/closing";
import { Comparison } from "./sections/comparison";
import { Demo } from "./sections/demo";
import { Hero } from "./sections/hero";
import { HowItWorks } from "./sections/how-it-works";
import { Loop } from "./sections/loop";
import { Nav } from "./sections/nav";
import { Team } from "./sections/team";
import { Threat } from "./sections/threat";

export function App() {
  return (
    <div id="top" className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-small font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Threat />
        <Loop />
        <HowItWorks />
        <Demo />
        <Comparison />
        <Team />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

export default App;
