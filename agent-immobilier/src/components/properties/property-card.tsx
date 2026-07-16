import Image from "next/image";
import Link from "next/link";
import { formatPrice, propertyTypeLabel } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
  city: string;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  imageUrl?: string;
  status?: string;
};

export function PropertyCard({
  slug,
  title,
  city,
  price,
  type,
  bedrooms,
  bathrooms,
  areaSqft,
  imageUrl,
}: Props) {
  return (
    <Link href={`/proprietes/${slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="33vw"
          />
        ) : null}
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
          {propertyTypeLabel(type)} · {city}
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
          {title}
        </h3>
        <p className="mt-1 text-slate-600">{formatPrice(price)}</p>
        <p className="mt-2 text-sm text-slate-500">
          {bedrooms} ch. · {bathrooms} sdb · {areaSqft.toLocaleString("fr-CA")} pi²
        </p>
      </div>
    </Link>
  );
}
