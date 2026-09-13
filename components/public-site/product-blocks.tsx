import { ProductImage, type ProductScene } from "./product-image";

export const wideSizes = "(min-width: 1512px) 1264px, (min-width: 1281px) calc(100vw - 248px), (min-width: 800px) calc(100vw - 128px), calc(100vw - 32px)";
export const cardSizes = "(min-width: 1512px) 616px, (min-width: 1281px) calc((100vw - 280px) / 2), (min-width: 800px) calc((100vw - 152px) / 2), calc(100vw - 32px)";

export function ConceptCaption({ performance = false }: { performance?: boolean }) {
  return <figcaption className="pp-caption">Concept preview · Demo data{performance ? ". Not verified trader performance." : ". Not a live account."}</figcaption>;
}

export function ProductCard({ scene, title, children, alt, wide = false, performance = false }: {
  scene: ProductScene; title: string; children: React.ReactNode; alt: string; wide?: boolean; performance?: boolean;
}) {
  return <article className={`pp-product-card${wide ? " pp-product-card-wide" : ""}`} data-reveal="image">
    <div className="pp-card-copy"><h3 className="pp-h3">{title}</h3><p>{children}</p></div>
    <figure><ProductImage scene={scene} alt={alt} sizes={wide ? wideSizes : cardSizes} /><ConceptCaption performance={performance} /></figure>
  </article>;
}
