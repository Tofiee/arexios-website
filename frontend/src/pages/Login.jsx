import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// Using direct URL params for errors now instead of state
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Login() {
  const { t } = useTranslation();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error")) {
      setErrorMsg("Giriş işlemi başarısız veya iptal edildi.");
    }
  }, [location]);

  const [score, setScore] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [shatters, setShatters] = useState([]);
  const audioRef = React.useRef(null);

  // Custom CS:GO crosshair (Green overlay)
  const crosshairUrl = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4v8M16 20v8M4 16h8M20 16h8" stroke="%2339ff14" stroke-width="2"/></svg>') 16 16, crosshair`;

  const targets = [
    { id: 1, type: 'static', x: 50, y: 40, classes: '' },
    { id: 2, type: 'moving-x', x: 60, y: 70, classes: 'target-move-x' },
    { id: 3, type: 'moving-y', x: 20, y: 50, classes: 'target-move-y' }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/ak47_shoot.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);

  const playShootSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio disabled:', e));
    }
  };

  const handleShoot = () => {
    setIsShooting(true);
    playShootSound();
    setTimeout(() => setIsShooting(false), 90);
  };

  const handleTargetClick = (e, index) => {
    e.stopPropagation(); // Prevent window click from firing twice
    handleShoot();

    if (index === score) {
      // Record position for shatter particles
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hitId = Date.now();
      
      setShatters(prev => [...prev, { id: hitId, x: cx, y: cy }]);
      setTimeout(() => {
        setShatters(prev => prev.filter(s => s.id !== hitId));
      }, 500);

      setScore(s => s + 1);
    }
  };

  useEffect(() => {
    if (score >= 3) {
      setTimeout(() => setShowLogin(true), 600);
    }
  }, [score]);

  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    const handleClick = () => {
      if(showLogin) return;
      handleShoot();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick);
    
    if(typeof window !== 'undefined'){
        setMousePos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [showLogin]);

  const currentTarget = score < 3 ? targets[score] : null;

  // NEW METHOD: Hybrid Visual Sway + Rotation (No mathematically breaking 3D bounds)
  const gunX = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const gunY = typeof window !== 'undefined' ? window.innerHeight : 1000;
  
  const pX = Math.max(0, Math.min(1, mousePos.x / gunX));
  const pY = Math.max(0, Math.min(1, mousePos.y / gunY));

  // The visual "horizon" of the 3D image is around 35-40% down from the top.
  // Above 0.4 -> point UP (Positive CSS rotation). Below 0.4 -> point DOWN (Negative CSS rotation).
  let visualRotation = (0.4 - pY) * 50; 
  if (visualRotation > 30) visualRotation = 30; // Max tilt up
  if (visualRotation < -35) visualRotation = -35; // Max tilt down

  // Hybrid Sway: Physically move the gun X/Y to track the mouse (Parallax)
  const translateX = (pX - 0.5) * 100; // Move left/right to follow
  
  // Anti-clipping Y Translation:
  // When making the gun point DOWN (negative rotation), the left part normally rotates out of the screen frame.
  // We combat this by hoisting the entire image UP (negative translateY) when the rotation is negative.
  const baseTranslateY = (pY - 0.5) * 50;
  const antiClipLift = visualRotation < 0 ? visualRotation * 1.5 : 0; // if -30deg, lift by -45px
  const translateY = baseTranslateY + antiClipLift;

  return (
    <div 
      className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-center bg-cover bg-no-repeat selection:bg-transparent" 
      style={{ 
        backgroundImage: "url('/bg-dust2.png')", 
        backgroundColor: '#111827', 
        backgroundBlendMode: 'overlay',
        cursor: !showLogin ? crosshairUrl : 'default'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-900/40 pointer-events-none" />
      
      {!showLogin && (
        <div className="absolute inset-x-0 top-10 flex flex-col items-center justify-center pointer-events-none z-10 animate-in fade-in space-y-3 px-4 text-center">
          <div className="bg-slate-900/90 border-2 border-orange-500 px-6 py-2 rounded text-white font-mono text-xl tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            {t('targetsDestroyed')} <span className="text-orange-500 font-bold ml-2">{score} / 3</span>
          </div>
          <div className="bg-black/60 border border-slate-700/50 px-5 py-2 rounded-full backdrop-blur-sm text-gray-300 font-medium text-sm animate-pulse tracking-wide">
            {t('targetsInfoMsg')}
          </div>
        </div>
      )}

      {!showLogin && currentTarget && (
        <button
          key={currentTarget.id}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0) rotate(180deg)';
            e.currentTarget.style.opacity = '0';
            e.currentTarget.style.pointerEvents = 'none';
            handleTargetClick(e, score);
          }}
          className={`absolute w-14 h-14 rounded-full border-4 border-red-600 bg-red-500/40 flex items-center justify-center transition-all duration-300 outline-none hover:bg-red-500/60 shadow-[0_0_15px_rgba(220,38,38,0.8)] focus:outline-none ${currentTarget.classes} animate-in zoom-in spin-in-12 duration-500`}
          style={{ 
            left: `${currentTarget.x}%`, 
            top: `${currentTarget.y}%`,
            boxShadow: '0 0 0 6px white inset, 0 0 15px rgba(220,38,38,0.8)',
            cursor: crosshairUrl // Keep crosshair when hovering over target
          }}
        >
          <div className="w-3 h-3 bg-red-600 rounded-full" />
        </button>
      )}

      {/* 3D Realistic Rotating AK-47 Representation */}
      {!showLogin && (
        <div 
          className="absolute bottom-[-30px] right-0 pointer-events-none z-10 transition-transform duration-75 origin-bottom-right ease-out"
          style={{
            transform: `translate(${translateX}px, ${translateY}px) rotate(${visualRotation}deg) ${isShooting ? 'translate(-10px, 15px)' : ''}`,
            width: '600px',
            height: '400px'
          }}
        >
          <img 
            src="/ak47_trans.png" 
            alt="AK-47 Weapon" 
            className="w-full h-full object-contain pointer-events-none opacity-100"
            style={{ 
               filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.8)) object-contain' 
            }} 
          />
          
          {/* Muzzle Flash adjusted for ak47.png barrel location */}
          {isShooting && (
            <div 
              className="absolute bg-orange-400 rounded-full blur-2xl opacity-90 transition-none" 
              style={{
                top: '25%', 
                left: '20%',
                width: '100px', 
                height: '100px',
              }} 
            />
          )}
        </div>
      )}

      {/* Target Shatter / Hit Marker Effects Overlay */}
      {shatters.map((s) => (
        <div key={s.id} className="absolute pointer-events-none z-50 text-orange-500 font-bold text-2xl" 
             style={{ left: s.x, top: s.y, transform: 'translate(-50%, -50%)' }}>
          <div className="absolute inset-0 flex items-center justify-center font-mono hit-text whitespace-nowrap">
            {t('headshot')}
          </div>
          {/* Scatter Particles */}
          {[...Array(6)].map((_, i) => {
             const angle = (i / 6) * Math.PI * 2;
             const dist = 50 + Math.random() * 30;
             return (
               <div key={i} className="absolute w-3 h-3 bg-red-500 particle rounded-full" 
                    style={{ 
                      '--tx': `${Math.cos(angle) * dist}px`, 
                      '--ty': `${Math.sin(angle) * dist}px` 
                    }} 
               />
             );
          })}
        </div>
      ))}

      {/* OAuth Login Menu Reveal */}
      {showLogin && (
        <div className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in-95 fill-mode-both duration-700">
          <div className="w-full max-w-sm bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-8 rounded shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
            <h2 className="text-3xl font-bold text-white mb-8 uppercase tracking-wider text-center" style={{fontFamily: 'Impact, sans-serif'}}>
              HIZLI GİRİŞ
            </h2>
            
            {errorMsg && (
              <div className="mb-6 bg-red-500/20 border border-red-500 text-red-400 p-3 rounded text-sm font-bold text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <a 
                href={`${API_URL}/auth/steam/login`}
                className="w-full py-4 bg-[#171a21] hover:bg-[#2a475e] text-white font-bold uppercase tracking-widest rounded border-b-4 border-[#101214] active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_15px_rgba(42,71,94,0.3)] hover:shadow-[0_0_20px_rgba(42,71,94,0.5)] text-sm flex items-center justify-center gap-3"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" className="w-6 h-6 brightness-200" />
                Steam ile Giriş
              </a>

              <a 
                href={`${API_URL}/auth/google/login`}
                className="w-full py-4 bg-white hover:bg-gray-100 text-gray-800 font-bold uppercase tracking-widest rounded border-b-4 border-gray-300 active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] text-sm flex items-center justify-center gap-3"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-6 h-6" />
                Google ile Giriş
              </a>
            </div>

            <p className="text-slate-500 text-xs text-center mt-6 uppercase tracking-wider leading-relaxed">
              Steam veya Google hesabı ile otomatik kayıt olup hemen portalı kullanmaya başlayın.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
