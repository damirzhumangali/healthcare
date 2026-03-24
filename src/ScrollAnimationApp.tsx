import React from 'react';
import { ScrollAnimationSection, OverlayContent } from './components/ScrollAnimation';
import './components/ScrollAnimation.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="h-screen flex items-center justify-center relative">
        <div className="text-center z-10">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Scroll Animation
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Experience frame-perfect scroll-driven animation powered by HTML Canvas
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full font-semibold text-white hover:scale-105 transition-transform"
            >
              Start Scrolling
            </button>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      </section>

      {/* Main Scroll Animation Section */}
      <ScrollAnimationSection 
        frameCount={150}
        sectionHeight="400vh"
        className="relative"
        data-scroll-container
      >
        {/* Feature Overlay 1 */}
        <OverlayContent startProgress={0.1} endProgress={0.25} position="left">
          <div className="max-w-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Lightning Fast</h3>
            </div>
            <p className="text-gray-200 leading-relaxed">
              Our scroll animation delivers 60fps performance with frame-perfect rendering and instant response to user input.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">60fps</span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">Smooth</span>
            </div>
          </div>
        </OverlayContent>

        {/* Feature Overlay 2 */}
        <OverlayContent startProgress={0.3} endProgress={0.45} position="right">
          <div className="max-w-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-1.414 1.414M21 12h-1M7.878 7.878l-1.414-1.414" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Smart Loading</h3>
            </div>
            <p className="text-gray-200 leading-relaxed">
              Intelligent batch loading ensures smooth performance even with hundreds of high-resolution frames.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">Batch Loading</span>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">Optimized</span>
            </div>
          </div>
        </OverlayContent>

        {/* Feature Overlay 3 */}
        <OverlayContent startProgress={0.5} endProgress={0.7} position="center">
          <div className="max-w-md p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4 2 2 0 000-4zm-7 8a2 2 0 11-4 0 2 2 0 014 0zm7 0a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white text-center mb-4">Precision Control</h3>
            <p className="text-gray-200 leading-relaxed text-center text-lg">
              Frame-by-frame rendering gives you complete control over the animation timeline and visual effects.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">150</div>
                <div className="text-sm text-gray-400">Frames</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">1640×1264</div>
                <div className="text-sm text-gray-400">Resolution</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">WebP</div>
                <div className="text-sm text-gray-400">Format</div>
              </div>
            </div>
          </div>
        </OverlayContent>

        {/* Feature Overlay 4 */}
        <OverlayContent startProgress={0.75} endProgress={0.9} position="left">
          <div className="max-w-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Responsive</h3>
            </div>
            <p className="text-gray-200 leading-relaxed">
              Works seamlessly across all devices with adaptive layouts and touch-friendly controls.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">Mobile</span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm">Tablet</span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">Desktop</span>
            </div>
          </div>
        </OverlayContent>
      </ScrollAnimationSection>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Technical Excellence
            </span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Frame-Perfect Rendering",
                description: "Each frame is rendered with precision timing, ensuring smooth playback without jank or stutter.",
                icon: "🎯"
              },
              {
                title: "Memory Efficient",
                description: "Smart loading strategies prevent memory bloat while maintaining high-quality visuals.",
                icon: "🧠"
              },
              {
                title: "Touch Optimized",
                description: "Native touch events and gesture support for mobile and tablet devices.",
                icon: "📱"
              },
              {
                title: "Cross-Browser Compatible",
                description: "Works flawlessly across all modern browsers with consistent performance.",
                icon: "🌐"
              },
              {
                title: "SEO Friendly",
                description: "Search engines can index the content while animations enhance user experience.",
                icon: "🔍"
              },
              {
                title: "Accessible",
                description: "Full keyboard navigation and screen reader support for inclusive design.",
                icon: "♿"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Create Your Own?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Get the complete scroll animation system and start creating immersive storytelling experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full font-semibold text-white hover:scale-105 transition-transform">
              Download Source Code
            </button>
            <button className="px-8 py-4 border border-gray-600 rounded-full font-semibold text-white hover:bg-gray-800 transition-colors">
              View Documentation
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            Built with React, TypeScript, and Canvas API. Frame-perfect scroll animations for modern web experiences.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
