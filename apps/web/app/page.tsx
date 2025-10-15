import { Button, Card, CardContent, CardHeader, CardTitle } from '@propad/ui';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-5xl flex-col gap-10 px-4 py-16">
      <section className="grid gap-6 text-center">
        <h1 className="text-4xl font-semibold md:text-5xl">A zero-fee property marketplace for Zimbabwe</h1>
        <p className="text-lg text-neutral-600">
          PropAd connects renters, buyers, landlords, and verified agents without charging viewing fees or commissions.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/auth/login">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/listings">Browse listings</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">{card.body}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

const cards = [
  {
    title: 'Verified listings',
    body: 'Every property is reviewed by a verifier before it goes live, ensuring trust for renters and buyers.'
  },
  {
    title: 'Zero platform fees',
    body: 'Landlords and agents earn from an ads-funded pool so the marketplace stays free for tenants.'
  },
  {
    title: 'Offline-friendly',
    body: 'Our PWA caches content for quick repeat visits and supports WhatsApp sharing to reach your audience.'
  }
];
