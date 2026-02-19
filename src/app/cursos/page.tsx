import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cursos | Visual Design',
  description: 'Aprenda web design, desenvolvimento e marketing digital com nossos cursos profissionais.',
}

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb */}
      <nav className="bg-black/50 border-b border-gray-800">
        <div className="max-w-[1380px] mx-auto px-4">
          <ol className="flex items-center space-x-2 py-4 text-sm">
            <li>
              <a href="/" className="text-gray-400 hover:text-white transition-colors">
                Início
              </a>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white font-medium">Cursos</li>
          </ol>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 bg-black" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url('/assets/BG.jpg')" }}
        />
        
        <div className="relative z-10 max-w-[1380px] mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Nossos <span className="text-red-600">Cursos</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Aprenda com profissionais e transforme sua carreira
            </p>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-20">
        <div className="max-w-[1380px] mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-red-600 to-red-800"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">Web Design Completo</h3>
                <p className="text-gray-300 mb-4">
                  Do básico ao avançado em design de sites modernos
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">MZN 5.000</span>
                  <span className="text-gray-400 text-sm">8 semanas</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-blue-600 to-blue-800"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">Desenvolvimento Web</h3>
                <p className="text-gray-300 mb-4">
                  HTML, CSS, JavaScript e frameworks modernos
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">MZN 7.500</span>
                  <span className="text-gray-400 text-sm">12 semanas</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-green-600 to-green-800"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">Marketing Digital</h3>
                <p className="text-gray-300 mb-4">
                  Estratégias digitais para crescimento de negócios
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">MZN 4.000</span>
                  <span className="text-gray-400 text-sm">6 semanas</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-purple-600 to-purple-800"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">UI/UX Design</h3>
                <p className="text-gray-300 mb-4">
                  Design de interfaces e experiência do usuário
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">MZN 6.000</span>
                  <span className="text-gray-400 text-sm">10 semanas</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-yellow-600 to-yellow-800"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">Design Gráfico</h3>
                <p className="text-gray-300 mb-4">
                  Criação de identidade visual e materiais gráficos
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">MZN 4.500</span>
                  <span className="text-gray-400 text-sm">8 semanas</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:transform hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-pink-600 to-pink-800"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">E-commerce</h3>
                <p className="text-gray-300 mb-4">
                  Criação de lojas virtuais lucrativas
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold">MZN 8.000</span>
                  <span className="text-gray-400 text-sm">16 semanas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
