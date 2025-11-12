import { tests } from '@/lib/data';
import { McqTest } from '@/components/mcq-test';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return tests.map((test) => ({
    slug: test.slug,
  }));
}

export default function TestPage({ params }: { params: { slug: string } }) {
  const test = tests.find((t) => t.slug === params.slug);

  if (!test) {
    notFound();
  }

  return <McqTest test={test} />;
}
