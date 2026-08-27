'use client';

import { motion } from "framer-motion";
import { CheckCircle, Zap, Globe, Shield, Layout, Settings, Mail, Phone, ArrowUpRight, MousePointer2, Rocket, BarChart3, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import ContactLeadModal from "@/components/ContactLeadModal";
import { translations } from "@/lib/translations";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const language = 'en';
  const currency = '$';
  const priceDisplay = '$150';
  const isEnglish = true;
  const t = translations[language];
  const promoVisible = false;

  const openLead = () => {
    window.location.href = '/orders';
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] as const }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-brand selection:text-white antialiased w-full max-w-full overflow-x-hidden">
      <ContactLeadModal open={leadOpen} onClose={() => setLeadOpen(false)} />
      {/* Navigation */}
      <nav className={`fixed inset-x-0 top-0 w-full max-w-full overflow-hidden box-border z-50 transition-all duration-700 ${scrolled ? 'h-16 sm:h-20 bg-black/40 backdrop-blur-2xl border-b border-white/5' : 'h-24 sm:h-32 bg-transparent'}`}>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 h-full flex items-center justify-between gap-3 min-w-0 overflow-hidden">
          <div className="flex items-center gap-6 group cursor-pointer">
            <div className="relative w-14 h-14 overflow-hidden rounded-2xl border-2 border-brand bg-[#1a0b2e] group-hover:border-brand-light transition-all duration-500 shadow-2xl shadow-brand/20">
              {!logoError ? (
                <Image 
                  src="/Logo.png" 
                  alt={isEnglish ? "Webs Bača Logo - web design, hosting and SEO" : "Webs Bača Logo - tvorba webů, hosting a SEO"} 
                  fill 
                  sizes="(max-width: 768px) 56px, 80px"
                  className="object-contain p-1 transition-transform duration-700 group-hover:scale-105"
                  onError={() => setLogoError(true)}
                  priority
                />
              ) : (
                <div className="w-full h-full bg-brand flex items-center justify-center">
                  <span className="text-white font-black text-xl">W</span>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter uppercase leading-none">WEBS BAČA</span>
              <span className="text-[9px] font-black text-brand tracking-[0.4em] mt-1 opacity-80 uppercase">Premium Digital</span>
            </div>
          </div>
          
          <div className="hidden lg:flex gap-14 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">
            {['why', 'pricing', 'process', 'specialization'].map((item) => (
              <a key={item} href={`#${item}`} className="hover:text-brand transition-all duration-300 hover:tracking-[0.4em]">
                {item === 'why' ? t.footerWhy : item === 'pricing' ? t.footerPricing : item === 'process' ? t.footerProcess : t.footerSpecialization}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={openLead}
            className="shrink-0 min-w-0 bg-brand text-white px-4 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 rounded-xl text-[10px] sm:text-xs font-black hover:bg-brand-dark transition-all duration-500 uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_0px_rgba(124,58,237,0.6)]"
          >
            {t.heroCTA}
          </button>
        </div>
      </nav>

      <main className="w-full max-w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className={`relative min-h-[110vh] flex items-center justify-center px-8 overflow-hidden w-full max-w-full ${promoVisible ? "pt-72 sm:pt-80 md:pt-96 lg:pt-[28rem]" : "pt-48 sm:pt-52"}`}>
          {/* Animated Background Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.08),transparent_60%)]" />
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.4, 0.3]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-1/4 left-0 w-[800px] h-[800px] bg-brand/10 rounded-full blur-[150px]" 
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ duration: 12, repeat: Infinity, delay: 1 }}
              className="absolute bottom-1/4 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-brand-dark/10 rounded-full blur-[80px] md:blur-[150px] pointer-events-none"
            />
          </div>
          
          <div className="max-w-7xl mx-auto w-full relative z-10 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] as const }}
            >
              <h1 className="mt-12 sm:mt-16 md:mt-20 lg:mt-24 text-7xl md:text-[160px] font-black tracking-tighter mb-12 leading-[0.8] text-balance uppercase">
                {t.heroTitle} <br />
                <span className="text-gradient">{t.heroSubtitle}</span>
              </h1>
              
              <div className="w-full text-center flex flex-col items-center gap-4 mb-20">
                <p className="text-xl md:text-3xl text-zinc-400 font-medium leading-relaxed">
                  {t.heroDescription}
                </p>
              </div>
              
              <div className="flex justify-center items-center gap-6 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.location.href = '/partnerprogram'}
                  className="w-full max-w-md sm:w-auto bg-brand/20 border-2 border-brand text-white px-8 py-5 sm:px-12 sm:py-6 md:px-16 md:py-8 rounded-[2rem] text-sm sm:text-base md:text-lg font-black hover:bg-brand hover:text-black transition-all duration-500 flex items-center justify-center gap-3 sm:gap-4 group uppercase tracking-tighter shadow-2xl"
                >
                  Partner Program
                  <ArrowUpRight size={22} className="sm:w-6 sm:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={openLead}
                  className="w-full max-w-md sm:w-auto bg-white text-black px-8 py-5 sm:px-12 sm:py-6 md:px-16 md:py-8 rounded-[2rem] text-sm sm:text-base md:text-lg font-black hover:bg-zinc-200 transition-all duration-500 flex items-center justify-center gap-3 sm:gap-4 group uppercase tracking-tighter shadow-2xl shadow-white/5"
                >
                  {t.heroCTA}
                  <ArrowUpRight size={22} className="sm:w-6 sm:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500 shrink-0" />
                </button>
              </div>
              <div className="mt-8 flex justify-center">
                <p className="bg-amber-400 text-black px-6 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                  For now it’s only available in USA
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The "Why" Section - Massive Spacing */}
        <section id="why" className="py-64 px-8 border-y border-white/5 relative overflow-hidden w-full max-w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-0 right-0 w-[600px] h-[600px] max-w-full bg-brand/5 rounded-full blur-[120px] pointer-events-none" /></div>
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeIn} className="mb-40 text-left max-w-4xl">
              <h2 className="text-5xl md:text-[100px] font-black mb-10 tracking-tighter leading-none uppercase">{t.whyTitle} <br /><span className="text-brand italic">{t.whySubtitle}</span></h2>
              <p className="text-zinc-500 uppercase tracking-[0.5em] text-sm font-black mb-12">{t.whyDescription}</p>
              <div className="h-1 w-32 bg-brand shadow-[0_0_20px_rgba(124,58,237,0.8)]" />
            </motion.div>
            
            <div className="grid lg:grid-cols-12 gap-10">
              <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="lg:col-span-8 card-premium p-16 rounded-[3rem] flex flex-col justify-between group relative overflow-hidden min-h-[500px]">
                <div className="absolute top-0 right-0 w-full h-full bg-glow opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mb-12 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-xl shadow-brand/5">
                    <Rocket size={40} />
                  </div>
                  <h3 className="text-5xl font-black mb-8 leading-tight tracking-tight uppercase" dangerouslySetInnerHTML={{ __html: t.whyCard1Title }} />
                  <p className="text-zinc-400 text-xl leading-relaxed max-w-xl font-medium">
                    {t.whyCard1Desc}
                  </p>
                </div>
                <div className="mt-16 flex flex-wrap items-center gap-10 text-brand font-black text-xs uppercase tracking-[0.3em] relative z-10">
                  <span className="flex items-center gap-2"><CheckCircle size={14} /> {t.zeroKc} VSTUP</span>
                  <span className="flex items-center gap-2"><CheckCircle size={14} /> {t.delivery24h}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              </motion.div>

              <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="lg:col-span-4 card-premium p-16 rounded-[3rem] flex flex-col justify-between group min-h-[500px]">
                <div>
                  <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mb-12 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-xl shadow-brand/5">
                    <BarChart3 size={40} />
                  </div>
                  <h3 className="text-4xl font-black mb-8 leading-tight tracking-tight uppercase" dangerouslySetInnerHTML={{ __html: t.whyCard2Title }} />
                  <p className="text-zinc-500 text-lg leading-relaxed font-medium">{t.whyCard2Desc}</p>
                </div>
                <div className="mt-12 text-zinc-700 font-black italic text-6xl">#1</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section - Ultra Premium */}
        <section id="pricing" className="py-64 px-8 relative overflow-hidden bg-[#020202] w-full max-w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] max-w-full bg-brand/5 rounded-full blur-[200px] pointer-events-none" /></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div {...fadeIn} className="text-center mb-40">
              <h2 className="text-6xl md:text-[140px] font-black mb-10 tracking-tighter leading-none uppercase">{t.pricingTitle} <br /><span className="text-brand">{t.pricingSubtitle}</span></h2>
              <p className="text-zinc-500 font-black uppercase tracking-[0.6em] text-sm">{t.pricingDescription}</p>
            </motion.div>
            
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                {...fadeIn}
                className="glass-purple p-12 md:p-20 rounded-[3rem] text-center border-brand/20 shadow-[0_0_100px_-20px_rgba(124,58,237,0.15)] relative group order-2 lg:order-1"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand px-10 py-4 rounded-2xl text-white font-black uppercase tracking-[0.4em] text-xs shadow-2xl shadow-brand/50">
                  {t.pricingPopular}
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="flex items-start justify-center mb-6">
                    <span className="text-4xl font-black mt-6 mr-4 text-zinc-500 tracking-tighter">{currency}</span>
                    <span className="text-[140px] md:text-[180px] font-black leading-none tracking-tighter text-gradient">{priceDisplay.replace(currency, '').replace('$', '').replace('Kč', '').trim()}</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-500 mb-6 italic">{t.pricingPerMonth}</div>
                  
                  <div className="flex justify-center w-full mb-16">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 w-full text-left">
                      {[
                        { icon: Globe, text: t.hosting },
                        { icon: Shield, text: t.ssl },
                        { icon: Layout, text: t.content },
                        { icon: Settings, text: t.support },
                        { icon: Zap, text: t.speed },
                        { icon: CheckCircle, text: t.revisions },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 group/item">
                          <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center group-hover/item:bg-brand group-hover/item:text-white transition-all duration-500 shadow-lg shrink-0">
                            <item.icon size={16} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.1em] text-zinc-300 leading-tight">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openLead}
                    className="w-full bg-white text-black py-6 sm:py-7 md:py-8 rounded-[2rem] font-black text-lg sm:text-xl md:text-2xl hover:scale-[1.02] transition-all duration-500 uppercase tracking-tighter shadow-2xl"
                  >
                    {t.pricingIncludes}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] as const }}
                className="relative hidden lg:block order-1 lg:order-2 overflow-hidden"
              >
                <div className="relative aspect-[4/5] w-full max-w-[500px] mx-auto">
                  <div className="absolute -inset-4 bg-brand/10 blur-3xl rounded-full" />
                  <div className="relative z-10 w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                    <Image 
                      src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2000&auto=format&fit=crop"
                      alt={isEnglish ? "Professional work environment - Webs Bača web design" : "Profesionální pracovní prostředí - Webs Bača tvorba webů"} 
                      fill
                      sizes="(min-width: 1024px) 500px, 100vw"
                      className="object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-8 left-8 right-8">
                       <p className="text-2xl font-black italic tracking-tighter mb-2 text-white">{t.pricingImageTitle}</p>
                       <p className="text-sm font-medium text-zinc-400">{t.pricingImageDesc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Process Section - Vertical Timeline */}
        <section id="process" className="py-64 px-8 relative w-full overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeIn} className="text-center mb-40">
               <h2 className="text-6xl md:text-[100px] font-black tracking-tighter uppercase leading-none">{t.processTitle} <br /><span className="text-brand">{t.processSubtitle}</span></h2>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-16 relative">
              {[
                { step: "01", title: t.step1Title, desc: t.step1Desc },
                { step: "02", title: t.step2Title, desc: t.step2Desc },
                { step: "03", title: t.step3Title, desc: t.step3Desc },
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  {...fadeIn}
                  transition={{ delay: i * 0.2 }}
                  className="group relative"
                >
                  <div className="text-[180px] font-black text-white/[0.02] absolute -top-32 left-0 select-none group-hover:text-brand/[0.05] transition-colors duration-1000">
                    {item.step}
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black mb-8 italic text-brand tracking-widest">{item.title}</h3>
                    <p className="text-zinc-500 font-medium leading-relaxed text-xl">{item.desc}</p>
                    <div className="mt-10 w-12 h-1 bg-brand/20 group-hover:w-full group-hover:bg-brand transition-all duration-1000" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Specialization - Grid */}
        <section id="specialization" className="py-64 px-8 bg-[#050505] w-full overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeIn} className="mb-40 flex flex-col md:flex-row md:items-end justify-between gap-10">
              <h2 className="text-5xl md:text-[100px] font-black tracking-tighter uppercase leading-none">{t.specTitle} <br /><span className="text-brand">{t.specSubtitle}</span></h2>
              <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-xs md:mb-4">{t.specDescription}</p>
            </motion.div>
            
            <div className="grid lg:grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden">
              {[
                { title: t.spec1Title, desc: t.spec1Desc, icon: Settings },
                { title: t.spec2Title, desc: t.spec2Desc, icon: Layout },
                { title: t.spec3Title, desc: t.spec3Desc, icon: MousePointer2 },
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  {...fadeIn}
                  className="bg-dark-bg p-20 hover:bg-brand/5 transition-all duration-700 group flex flex-col justify-between min-h-[500px]"
                >
                  <div>
                    <item.icon size={48} className="text-brand/30 group-hover:text-brand mb-12 transition-colors duration-500" />
                    <h3 className="text-3xl font-black mb-10 italic text-white group-hover:text-brand transition-all duration-500">{item.title}</h3>
                    <p className="text-zinc-500 font-medium leading-relaxed text-xl">{item.desc}</p>
                  </div>
                  <div className="mt-16 text-brand font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {t.exploreSolution}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Affiliate Program Section */}
        <section className="py-64 px-8 bg-[#050505] relative overflow-hidden w-full max-w-full">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] max-w-full bg-brand/5 rounded-full blur-[200px] pointer-events-none" /></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div {...fadeIn} className="text-center mb-24">
              <h2 className="text-5xl md:text-[80px] font-black tracking-tighter uppercase leading-none mb-8">{t.affiliateTitle}</h2>
              <p className="text-xl md:text-2xl text-zinc-400 font-medium leading-relaxed mb-8">{t.affiliateDescription}</p>
              <p className="text-lg md:text-xl text-zinc-500 leading-relaxed">{t.affiliatePitch}</p>
            </motion.div>
            
            <motion.div {...fadeIn} className="grid lg:grid-cols-2 gap-16 items-start mb-24">
              {/* Left side - Why partner */}
              <div>
                <h3 className="text-3xl font-black mb-12 italic text-white">{t.affiliateHeading}</h3>
                <div className="space-y-10">
                  <div className="flex gap-6 group">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all duration-500">
                      <Zap size={24} />
                    </div>
                    <p className="text-zinc-400 text-lg leading-relaxed pt-2">{t.affiliateReason1}</p>
                  </div>
                  
                  <div className="flex gap-6 group">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all duration-500">
                      <BarChart3 size={24} />
                    </div>
                    <p className="text-zinc-400 text-lg leading-relaxed pt-2">{t.affiliateReason2}</p>
                  </div>
                  
                  <div className="flex gap-6 group">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all duration-500">
                      <Sparkles size={24} />
                    </div>
                    <p className="text-zinc-400 text-lg leading-relaxed pt-2">{t.affiliateReason3}</p>
                  </div>
                </div>
              </div>
              
              {/* Right side - Tiers */}
              <div className="glass-purple p-16 md:p-20 rounded-[2.5rem] border border-brand/20">
                <h3 className="text-2xl font-black mb-10 text-white">{t.affiliateTiers}</h3>
                <div className="space-y-6 mb-12">
                  <div className="p-6 bg-brand/5 rounded-2xl border border-brand/10 hover:border-brand/30 hover:bg-brand/10 transition-all duration-500">
                    <div className="text-lg font-black text-brand mb-2">📊 {t.affiliateTier1}</div>
                  </div>
                  <div className="p-6 bg-brand/5 rounded-2xl border border-brand/10 hover:border-brand/30 hover:bg-brand/10 transition-all duration-500">
                    <div className="text-lg font-black text-brand mb-2">📈 {t.affiliateTier2}</div>
                  </div>
                  <div className="p-6 bg-brand/5 rounded-2xl border border-brand/10 hover:border-brand/30 hover:bg-brand/10 transition-all duration-500">
                    <div className="text-lg font-black text-brand mb-2">🚀 {t.affiliateTier3}</div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => window.location.href = '/partnerprogram'}
                  className="w-full bg-brand text-white py-6 md:py-8 rounded-[2rem] font-black text-lg md:text-xl hover:scale-[1.02] transition-all duration-500 uppercase tracking-tighter shadow-2xl shadow-brand/50"
                >
                  {t.affiliateButton}
                </button>
              </div>
            </motion.div>
            
            <motion.div {...fadeIn} className="bg-brand/10 border border-brand/20 p-16 rounded-[2.5rem] text-center">
              <p className="text-lg md:text-xl text-zinc-300 leading-relaxed mb-8">{t.affiliateCTA}</p>
            </motion.div>
          </div>
        </section>

        {/* Final CTA - Massive */}
        <section className="py-64 px-8 w-full overflow-hidden">
          <motion.div 
            {...fadeIn}
            className="max-w-7xl mx-auto bg-brand p-24 md:p-48 rounded-[5rem] text-center relative overflow-hidden group shadow-[0_50px_100px_-20px_rgba(124,58,237,0.4)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={openLead}
                aria-label={isEnglish ? "Open order form" : "Otevřít poptávkový formulář"}
                className="text-4xl sm:text-5xl md:text-7xl lg:text-[120px] font-black text-white tracking-tighter leading-[0.85] sm:leading-[0.8] uppercase text-center hover:opacity-95 active:scale-[0.99] transition-all max-w-[95vw]"
              >
                <span className="block">{t.ctaStart}</span>
                <span className="block">{t.ctaEarn}</span>
                <span className="block">{t.ctaTomorrow}</span>
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="py-40 px-8 border-t border-white/5 bg-[#020202] w-full overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-20 mb-32">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-6 mb-12 group cursor-pointer">
                <div className="relative w-16 h-16 overflow-hidden rounded-2xl border-2 border-brand bg-[#1a0b2e] group-hover:border-brand-light transition-all duration-500 shadow-2xl shadow-brand/20">
                  {!logoError ? (
                    <Image src="/Logo.png" alt={isEnglish ? "Webs Bača Logo - web design, hosting and SEO" : "Webs Bača Logo - tvorba webů, hosting a SEO"} fill sizes="128px" className="object-contain p-1" onError={() => setLogoError(true)} />
                  ) : (
                    <div className="w-full h-full bg-brand flex items-center justify-center">
                      <span className="text-white font-black text-2xl">W</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-4xl font-black italic tracking-tighter uppercase leading-none">WEBS BAČA</span>
                  <span className="text-[10px] font-black text-brand tracking-[0.5em] mt-2 uppercase">The Drive to Success</span>
                </div>
              </div>
              <p className="text-zinc-500 text-xl max-w-md leading-relaxed font-medium">
                {t.footerDescription}
              </p>
            </div>
            
            <div className="lg:col-span-3">
               <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-brand mb-10">{t.footerContact}</h4>
               <div className="flex flex-col gap-6 text-sm font-bold text-zinc-400">
                  <button type="button" onClick={openLead} className="text-left hover:text-white transition-all duration-300 flex items-center gap-4 group w-full">
                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center group-hover:bg-brand transition-colors">
                      <Mail size={18} />
                    </div>
                    info@websbaca.cz
                  </button>
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center group-hover:bg-brand transition-colors">
                      <Phone size={18} />
                    </div>
                    {t.supportPhoneMain}
                  </div>
               </div>
            </div>
            
            <div className="lg:col-span-3">
               <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-brand mb-10">{t.footerNavigation}</h4>
               <div className="grid grid-cols-2 gap-6 text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">
                  <a href="#why" className="hover:text-white transition-all duration-300">{t.footerWhy}</a>
                  <a href="#pricing" className="hover:text-white transition-all duration-300">{t.footerPricing}</a>
                  <a href="#process" className="hover:text-white transition-all duration-300">{t.footerProcess}</a>
                  <a href="#specialization" className="hover:text-white transition-all duration-300">{t.footerSpecialization}</a>
               </div>
            </div>
          </div>
          
          <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.6em]">
              {t.footerCopyright}
            </div>
            <div className="flex gap-14 text-[11px] text-zinc-600 font-black uppercase tracking-[0.6em]">
               <a href="/privacy" className="hover:text-brand cursor-pointer transition-colors">{t.footerGDPR}</a>
               <a href="/terms" className="hover:text-brand cursor-pointer transition-colors">{t.footerVOP}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
