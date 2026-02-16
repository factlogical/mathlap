import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  Brain,
  Activity,
  Zap,
  Code,
  FlaskConical,
  ArrowLeft,
  Cpu,
  Atom
} from 'lucide-react';

const Home = ({ onNavigate }) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    const particles = [];
    const mathSymbols = ['∑', '∫', '∞', 'π', 'Δ', '∇', 'λ', 'θ', 'ϕ', 'μ', 'σ', 'Ω', '≈', '≠', '≤', '≥'];

    const PARTICLE_COUNT = 140;
    const CONNECTION_DIST = 170;
    const MOUSE_DIST = 210;
    const MOUSE_FORCE = 0.04;
    const SPEED_LIMIT = 0.42;
    const RANDOM_IMPULSE = 0.002;
    const MIN_SPEED = 0.025;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles.length = 0;
      mouseRef.current = { x: width / 2, y: height / 2 };
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const isSymbol = Math.random() < 0.18;
        const symbol = isSymbol ? mathSymbols[Math.floor(Math.random() * mathSymbols.length)] : null;
        const symbolSize = isSymbol ? Math.random() * 10 + 14 : 0;
        const driftSpeed = isSymbol
          ? Math.random() * 0.012 + 0.006
          : Math.random() * 0.008 + 0.004;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          radius: Math.random() * 1.7 + 0.5,
          baseAlpha: Math.random() * 0.35 + 0.25,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.02 + 0.01,
          type: isSymbol ? 'symbol' : 'dot',
          symbol,
          symbolSize,
          mass: isSymbol ? 1.1 : 0.8,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed,
          driftTurn: (Math.random() - 0.5) * 0.0025,
          collideRadius: isSymbol ? symbolSize * 0.65 : 0
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(2, 4, 9, 0.55)';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.twinkleSpeed;
        p.driftAngle += p.driftTurn + (Math.random() - 0.5) * 0.0022;
        p.vx += Math.cos(p.driftAngle) * p.driftSpeed;
        p.vy += Math.sin(p.driftAngle) * p.driftSpeed;

        // subtle random walk
        p.vx += (Math.random() - 0.5) * 0.0009;
        p.vy += (Math.random() - 0.5) * 0.0009;

        if (Math.random() < 0.006) {
          p.vx += (Math.random() - 0.5) * RANDOM_IMPULSE;
          p.vy += (Math.random() - 0.5) * RANDOM_IMPULSE;
        }

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < MOUSE_DIST) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST;
          const influence = MOUSE_FORCE * (1 / p.mass);
          p.vx -= (dx / dist) * force * influence;
          p.vy -= (dy / dist) * force * influence;
        }

        p.vx *= 0.996;
        p.vy *= 0.996;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > SPEED_LIMIT) {
          p.vx = (p.vx / speed) * SPEED_LIMIT;
          p.vy = (p.vy / speed) * SPEED_LIMIT;
        }
        if (speed < MIN_SPEED) {
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
        }
      }

      // Symbol collisions
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (p1.type !== 'symbol') continue;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (p2.type !== 'symbol') continue;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = p1.collideRadius + p2.collideRadius;
          if (dist > 0 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;
            p1.x += nx * overlap;
            p1.y += ny * overlap;
            p2.x -= nx * overlap;
            p2.y -= ny * overlap;

            const dvx = p1.vx - p2.vx;
            const dvy = p1.vy - p2.vy;
            const impact = dvx * nx + dvy * ny;
            if (impact < 0) {
              const impulse = -impact * 0.6;
              p1.vx += nx * impulse;
              p1.vy += ny * impulse;
              p2.vx -= nx * impulse;
              p2.vy -= ny * impulse;
            }
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          if (p1.type === 'symbol' || p2.type === 'symbol') continue;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(80, 170, 255, ${opacity})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        const twinkle = (Math.sin(p.phase) + 1) * 0.5;
        const alpha = Math.min(1, p.baseAlpha + twinkle * 0.45);

        if (p.type === 'symbol') {
          ctx.font = `${p.symbolSize}px "Cairo", "Tajawal", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(170, 225, 255, ${alpha * 0.85})`;
          ctx.shadowColor = 'rgba(100, 190, 255, 0.6)';
          ctx.shadowBlur = 12;
          ctx.fillText(p.symbol, p.x, p.y);
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(90, 175, 255, ${alpha * 0.26})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(170, 230, 255, ${alpha})`;
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div dir="rtl" className="landing-root">
      <canvas ref={canvasRef} className="landing-canvas" />
      <div className="landing-overlay landing-overlay--blue" />
      <div className="landing-overlay landing-overlay--violet" />

      <div className="landing-content">
        <section className="landing-hero">
          <div className="landing-badge landing-fade">
            <Sparkles className="h-4 w-4" />
            <span>الجيل القادم من الرياضيات التفاعلية</span>
          </div>

          <h1 className="landing-title landing-rise">
            <span className="landing-title-main">أطلق العنان</span>
            <span className="landing-title-accent">للحدس الرياضي</span>
          </h1>

          <p className="landing-subtitle landing-fade">
            استكشف عالم الرياضيات الخفي عبر الذكاء الاصطناعي التحادثي للرسم البياني
            والتصورات الغامرة رباعية الأبعاد، مدعومة بنماذج توليدية متقدمة.
          </p>

          <div className="landing-pills landing-fade">
            <div className="landing-pill">
              <Zap className="h-4 w-4" />
              <span>رسم فوري في الوقت الفعلي</span>
            </div>
            <div className="landing-pill">
              <Brain className="h-4 w-4" />
              <span>مدعوم بالذكاء الاصطناعي</span>
            </div>
            <div className="landing-pill">
              <Activity className="h-4 w-4" />
              <span>تصورات رباعية الأبعاد</span>
            </div>
          </div>
        </section>

        <section className="landing-cards">
          <button
            type="button"
            onClick={() => onNavigate?.('chat')}
            className="landing-card landing-card--chat"
          >
            <div className="landing-card-inner">
              <div className="landing-card-content">
                <h3 className="landing-card-title">مساعد الدردشة الذكي</h3>
                <p className="landing-card-desc">
                  اطرح الأسئلة، حل المعادلات، وأنشئ رسومات بيانية معقدة باستخدام اللغة الطبيعية.
                </p>
                <span className="landing-card-action landing-card-action--chat">
                  ابدأ المحادثة
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </div>
              <div className="landing-card-icon landing-card-icon--chat">
                <Code className="h-7 w-7" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('lab')}
            className="landing-card landing-card--lab"
          >
            <div className="landing-card-inner">
              <div className="landing-card-content">
                <h3 className="landing-card-title">المختبر التفاعلي</h3>
                <p className="landing-card-desc">
                  للحركة، الأسطح رباعية الأبعاد، والمزيد. انغمس في المحاكاة الفورية: الجبر الخطي و DSL.
                </p>
                <span className="landing-card-action landing-card-action--lab">
                  ادخل المختبر
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </div>
              <div className="landing-card-icon landing-card-icon--lab">
                <FlaskConical className="h-7 w-7" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('neural')}
            className="landing-card landing-card--cs"
          >
            <div className="landing-card-inner">
              <div className="landing-card-content">
                <div className="landing-card-badge">Available</div>
                <h3 className="landing-card-title">Computer Science Lab</h3>
                <p className="landing-card-desc">
                  Neural Network Lab is live. Algorithms, graphs, and systems labs are coming soon.
                </p>
                <span className="landing-card-action landing-card-action--cs">
                  Open Neural Network Lab
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </div>
              <div className="landing-card-icon landing-card-icon--cs">
                <Cpu className="h-7 w-7" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('physics')}
            className="landing-card landing-card--physics"
          >
            <div className="landing-card-inner">
              <div className="landing-card-content">
                <div className="landing-card-badge">Available</div>
                <h3 className="landing-card-title">Physics Lab</h3>
                <p className="landing-card-desc">
                  Explore Fourier analysis, waves, and real-world signal applications interactively.
                </p>
                <span className="landing-card-action landing-card-action--physics">
                  Open Physics Lab
                  <ArrowLeft className="h-4 w-4" />
                </span>
              </div>
              <div className="landing-card-icon landing-card-icon--physics">
                <Atom className="h-7 w-7" />
              </div>
            </div>
          </button>

        </section>
      </div>
    </div>
  );
};

export default Home;
