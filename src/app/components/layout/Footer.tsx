export const Footer = () => {
  return (
    <footer className="mt-20 px-6 pb-12 text-center space-y-6">
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            📍 Joaquim Pereira da Silveira - Conjunto Esperança
          </p>
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffcc00] opacity-50">
          Point Maciel © 2026
        </p>
        
        <div className="text-[9px] font-medium text-white/20 uppercase tracking-widest">
          Desenvolvido por - <span className="text-white/40 hover:text-[#ffcc00] transition-colors cursor-pointer italic">Visual Stack</span>
        </div>
      </div>
    </footer>
  );
};