'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bath, BedDouble, Ruler } from 'lucide-react';

export interface LandingProperty {
  id: string;
  title: string;
  location: string;
  price: string;
  status: 'FOR SALE' | 'FOR RENT';
  statusTone: 'sale' | 'rent';
  imageUrl: string;
  beds: number;
  baths: number;
  area: number;
}

const statusStyles: Record<LandingProperty['statusTone'], string> = {
  sale: 'bg-emerald-500 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.7)]',
  rent: 'bg-cyan-500 text-white shadow-[0_12px_30px_-12px_rgba(14,165,233,0.7)]'
};

export function LandingPropertyCard({
  property
}: {
  property: LandingProperty;
}) {
  return (
    <motion.article
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="group flex flex-col overflow-hidden rounded-[24px] bg-white shadow-lg ring-1 ring-slate-100"
    >
      <div className="relative h-64 overflow-hidden">
        <Image
          src={property.imageUrl}
          alt={property.title}
          fill
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
          <span className={`rounded-full px-3 py-1 text-[11px] tracking-[0.3em] ${statusStyles[property.statusTone]}`}>
            {property.status}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-sm uppercase tracking-[0.28em] text-white/70">{property.location}</p>
          <h3 className="mt-1 text-2xl font-semibold">{property.title}</h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-sm font-medium uppercase tracking-[0.35em] text-slate-400">Starting at</span>
          <span className="text-lg font-semibold text-slate-900">{property.price}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-2"><BedDouble className="h-4 w-4" />{property.beds} Beds</span>
          <span className="flex items-center gap-2"><Bath className="h-4 w-4" />{property.baths} Baths</span>
          <span className="flex items-center gap-2"><Ruler className="h-4 w-4" />{property.area} m²</span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">Curated by PropAd</span>
          <span className="text-xs font-semibold text-slate-400">View listing →</span>
        </div>
      </div>
    </motion.article>
  );
}
