import { Header } from "@/components/layout/Header";
import { Feed } from "@/components/dashboard/Feed";
import { TimelineWidget } from "@/components/dashboard/TimelineWidget";
import { InternetWidget } from "@/components/dashboard/InternetWidget";
import { FlightWidget } from "@/components/dashboard/FlightWidget";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1440px] px-0 pb-10 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,780px)_minmax(360px,420px)] lg:justify-center lg:gap-10 xl:grid-cols-[minmax(0,820px)_minmax(380px,460px)]">
          <div className="min-w-0 lg:border-x lg:border-border-default lg:bg-surface-1">
            <Feed />
          </div>

          <aside className="px-4 sm:px-0">
            <div className="flex flex-col gap-6 lg:sticky lg:top-20">
              <section>
                <TimelineWidget />
              </section>
              <section>
                <InternetWidget />
              </section>
              <section>
                <FlightWidget />
              </section>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
