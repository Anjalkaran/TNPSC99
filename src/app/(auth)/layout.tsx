import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'homepage-hero');
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-no-repeat p-4 bg-left md:bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${heroImage?.imageUrl})`,
      }}
    >
      {children}
    </div>
  );
}
