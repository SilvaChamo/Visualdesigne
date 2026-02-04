import { Header } from '@/components/layout/Header'
import { BannerSlider } from '@/components/sections/BannerSlider'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <BannerSlider />
    </div>
  );
}
