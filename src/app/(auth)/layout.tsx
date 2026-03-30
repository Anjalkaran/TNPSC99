import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'homepage-hero');
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10" />
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
