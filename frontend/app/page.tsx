import { Header } from "@/components/layout/Header";
import { Feed } from "@/components/dashboard/Feed";
import { InternetWidget } from "@/components/dashboard/InternetWidget";
import { FlightWidget } from "@/components/dashboard/FlightWidget";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Main Feed Column (Left / Center) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Feed />
          </div>

          {/* Side Widgets Column (Right) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="sticky top-20 flex flex-col gap-6">

              {/* Internet Widget */}
              <section className="space-y-4">
                <InternetWidget />
              </section>

              {/* Flight Widget */}
              <section className="space-y-4">
                <FlightWidget />
              </section>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
