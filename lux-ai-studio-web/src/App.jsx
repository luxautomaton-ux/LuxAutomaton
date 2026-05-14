import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';

function AnimatedSphere() {
  const meshRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={2}>
        <MeshDistortMaterial
          color="#ff6b00"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          emissive="#ff6b00"
          emissiveIntensity={0.2}
        />
      </Sphere>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <AnimatedSphere />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ff6b00" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4edea3" />
    </>
  );
}

const features = [
  {
    icon: "🧠",
    title: "Local-First AI",
    desc: "Run LLMs on your machine. No cloud, no limits, total privacy.",
    gradient: "from-orange-600 to-amber-500"
  },
  {
    icon: "🔒",
    title: "Sovereign Security",
    desc: "Your data never leaves your hardware. Enterprise-grade encryption.",
    gradient: "from-emerald-500 to-teal-400"
  },
  {
    icon: "⚡",
    title: "GPU Acceleration",
    desc: "Harness Metal, CUDA, or ROCm for lightning-fast inference.",
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    icon: "🤖",
    title: "Agent Orchestration",
    desc: "Coordinate Manus, Claude Code, and custom agents from one terminal.",
    gradient: "from-violet-600 to-purple-500"
  }
];

const modules = [
  { name: "Hermes OS", desc: "Web UI for agentic chat", color: "#ff6b00" },
  { name: "Lux Manus", desc: "Autonomous research agent", color: "#4edea3" },
  { name: "Lux CoWork", desc: "Collaborative workspace", color: "#b7c8e1" },
  { name: "Claude Code", desc: "Private coding copilot", color: "#8a9ab2" },
];

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              rgba(255, 107, 0, 0.15) 0%, 
              transparent 50%),
              radial-gradient(circle at ${50 + mousePos.x * 20}% ${50 + mousePos.y * 20}%, 
              rgba(78, 222, 163, 0.1) 0%, 
              transparent 40%)`
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <span className="text-xl font-bold tracking-tight">LUX AI STUDIO</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#stack" className="hover:text-white transition-colors">Stack</a>
          </nav>
          <button className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full font-semibold text-black hover:shadow-[0_0_30px_rgba(255,107,0,0.5)] transition-all">
            Download
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* 3D Canvas */}
        <div className="absolute inset-0 z-0 opacity-60">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <Scene />
          </Canvas>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-300">v2.0.4 Stable Released</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Your Local AI
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 bg-clip-text text-transparent">
              Operating Stack
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
          >
            Private by default. Powered by open-source agents. 
            Run everything on your hardware. Welcome to sovereign computing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black text-lg hover:shadow-[0_0_40px_rgba(255,107,0,0.6)] transition-all transform hover:scale-105">
              ⚡ Download for Free
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <span>📄</span> View Documentation
            </button>
          </motion.div>

          {/* Terminal Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-gray-400 font-mono">lux-cli ~ /stack</span>
              </div>
              <div className="p-6 font-mono text-left text-sm">
                <p className="text-gray-400">&gt; lux init --local</p>
                <p className="text-gray-500 mt-1">[INFO] Initializing environment...</p>
                <p className="text-gray-500">[INFO] Hardware detected: Apple M3 Max</p>
                <p className="text-green-400 mt-2">&gt; lux agent start --model=gemma-4</p>
                <p className="text-gray-500 mt-1">[INFO] Loading model weights...</p>
                <p className="text-green-400">Model loaded in 2.4s</p>
                <p className="mt-3 flex items-center gap-2">
                  <span className="text-orange-400 font-bold">● READY</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-500"
        >
          ↓
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Core Infrastructure</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built for uncompromising security and maximum hardware utilization
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer"
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="relative py-32 px-6 bg-gradient-to-b from-transparent via-orange-900/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Integrated Modules</h2>
            <p className="text-gray-400">One stack. Infinite possibilities.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all text-center"
              >
                <div 
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                  style={{ background: `linear-gradient(135deg, ${mod.color}40, ${mod.color}20)` }}
                >
                  ⚡
                </div>
                <h3 className="font-bold mb-1">{mod.name}</h3>
                <p className="text-sm text-gray-500">{mod.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative p-12 rounded-3xl bg-gradient-to-br from-orange-900/20 via-black to-emerald-900/20 border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-emerald-500/10 rounded-3xl blur-3xl" />
            <div className="relative">
              <h2 className="text-4xl font-bold mb-4">Ready to go local?</h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Join 10,000+ developers building sovereign AI. 
                Download the stack and start in minutes.
              </p>
              <button className="px-10 py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black text-lg hover:shadow-[0_0_50px_rgba(255,107,0,0.6)] transition-all transform hover:scale-105">
                ⚡ Download Lux Studio
              </button>
              <p className="mt-4 text-sm text-gray-500">macOS • Windows • Linux</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <span className="text-sm">⚡</span>
            </div>
            <span className="font-bold">LUX AI STUDIO</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
          <p className="text-sm text-gray-600">© 2024 Lux AI Studio</p>
        </div>
      </footer>
    </div>
  );
}