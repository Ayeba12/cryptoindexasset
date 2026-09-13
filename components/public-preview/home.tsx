import { PublicHeader } from "@/components/public-site/header";
import { PublicFooter } from "@/components/public-site/footer";
import { PublicHome } from "@/components/public-site/home";

export function PublicHomePreview() {
  return <><PublicHeader /><PublicHome preview /><PublicFooter preview /></>;
}
