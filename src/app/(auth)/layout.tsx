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
    <div
      className="flex min-h-screen flex-col bg-cover bg-no-repeat bg-left md:bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${heroImage?.imageUrl})`,
      }}
    >
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
