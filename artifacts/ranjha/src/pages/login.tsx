import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Mail, Facebook, Github } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { Particles } from "@/components/game/Particles";
import bgLogin from "@/assets/images/bg-login.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useGame();

  const handleLogin = (type: 'google' | 'facebook' | 'guest') => {
    login(type);
    setLocation("/lobby");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background flex flex-col items-center justify-center">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{ backgroundImage: `url(${bgLogin})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <Particles count={40} type="ember" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md p-6 gap-8">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="horror-title text-7xl text-primary drop-shadow-[0_0_20px_rgba(244,180,26,0.6)]">
            RANJHA
          </h1>
          <p className="font-display tracking-[0.3em] text-primary/80 text-sm mt-2">BATTLE ROYALE</p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="w-full flex flex-col gap-4"
        >
          <button 
            onClick={() => handleLogin('google')}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-display font-bold px-6 py-4 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            <Mail className="w-5 h-5 text-red-500" />
            CONTINUE WITH GOOGLE
          </button>
          
          <button 
            onClick={() => handleLogin('facebook')}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-display font-bold px-6 py-4 rounded-lg hover:bg-[#166fe5] transition-colors shadow-lg shadow-blue-900/50"
          >
            <Facebook className="w-5 h-5" />
            CONTINUE WITH FACEBOOK
          </button>

          <p className="text-center text-xs text-white/50 font-sans px-4">
            We will only share what you select. By continuing, you agree to our Terms of Service.
          </p>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-sm font-display">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            onClick={() => handleLogin('guest')}
            className="w-full flex items-center justify-center gap-3 bg-white/5 text-white font-display font-bold px-6 py-4 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
          >
            <User className="w-5 h-5 text-white/70" />
            CONTINUE AS GUEST
          </button>

          <p className="text-center text-xs text-white/40 font-sans">
            Guest data cannot be transferred or shared
          </p>
        </motion.div>
      </div>
    </div>
  );
}
