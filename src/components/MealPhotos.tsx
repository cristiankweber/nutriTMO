import Image from "next/image";

type Photo = { url: string; label: string };

export function MealPhotos({
  preMealImageUrl,
  postMealImageUrl,
}: {
  preMealImageUrl: string | null;
  postMealImageUrl: string | null;
}) {
  const photos = [
    { url: preMealImageUrl, label: "Pre-refeicao" },
    { url: postMealImageUrl, label: "Pos-refeicao" },
  ].filter((photo): photo is Photo => Boolean(photo.url));

  if (photos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {photos.map((photo, index) => (
        <a key={photo.label} href={photo.url} target="_blank" rel="noreferrer" className="block" title="Abrir em tamanho real">
          <Image
            src={photo.url}
            alt={`Foto ${photo.label.toLowerCase()}`}
            width={112}
            height={80}
            loading={index === 0 ? "eager" : "lazy"}
            unoptimized
            className="h-20 w-28 rounded-md border border-stone-200 bg-stone-100 object-cover"
          />
          <span className="mt-1 block text-center text-xs text-stone-600">{photo.label}</span>
        </a>
      ))}
    </div>
  );
}
