import React, { useEffect, useRef } from 'react';
import { MessageSquare, FlaskConical, Sparkles, ArrowRight, Zap, Atom, Binary } from 'lucide-react';

const Home = ({ onNavigate }) => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    // -- 1. Canvas Animation Engine --
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let animationFrameId;

        // Configuration
        const PARTICLE_COUNT = 100;
        const CONNECTION_DIST = 180;
        const MOUSE_DIST = 250;

        // Resize Handler
        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        };

        // Particle Class
        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.size = Math.random() * 2.5 + 1;
                // Random color from palette
                const colors = ['#36c2c9', '#8b5cf6', '#10b981', '#f59e0b'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Mouse interaction
                const dx = mouseRef.current.x - this.x;
                const dy = mouseRef.current.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < MOUSE_DIST) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (MOUSE_DIST - distance) / MOUSE_DIST;
                    const direction = 1; // attract
                    const strength = 0.03;

                    this.vx += forceDirectionX * force * strength * direction;
                    this.vy += forceDirectionY * force * strength * direction;
                }

                // Speed limit
                const maxSpeed = 1.5;
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > maxSpeed) {
                    this.vx = (this.vx / speed) * maxSpeed;
                    this.vy = (this.vy / speed) * maxSpeed;
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = 0.7;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw Connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DIST) {
                        const opacity = (1 - distance / CONNECTION_DIST) * 0.5;
                        ctx.beginPath();
                        const gradient = ctx.createLinearGradient(
                            particles[i].x, particles[i].y,
                            particles[j].x, particles[j].y
                        );
                        gradient.addColorStop(0, particles[i].color);
                        gradient.addColorStop(1, particles[j].color);
                        ctx.strokeStyle = gradient;
                        ctx.globalAlpha = opacity;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            // Update & Draw Particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        // Listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        });

        // Init
        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // -- 2. UI Component --
    return (
        <div className="home-container">
            {/* Background Canvas */}
            <canvas
                ref={canvasRef}
                className="home-canvas"
            />

            {/* Gradient Overlays */}
            <div className="home-gradient-overlay" />
            <div className="home-radial-glow" />

            {/* Content Container */}
            <div className="home-content">

                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-badge">
                        <Sparkles size={14} />
                        <span>Next-Gen Math AI</span>
                    </div>

                    <h1 className="hero-title">
                        <span className="hero-title-line">UNLEASH</span>
                        <span className="hero-title-line hero-title-gradient">MATHEMATICAL</span>
                        <span className="hero-title-line">INTUITION</span>
                    </h1>

                    <p className="hero-description">
                        Explore the unseen universe of mathematics. From conversational AI plotting
                        to immersive 4D visualizations, powered by advanced generative models.
                    </p>

                    {/* Feature Pills */}
                    <div className="hero-features">
                        <div className="feature-pill">
                            <Zap size={14} />
                            <span>Real-time Plotting</span>
                        </div>
                        <div className="feature-pill">
                            <Atom size={14} />
                            <span>4D Visualization</span>
                        </div>
                        <div className="feature-pill">
                            <Binary size={14} />
                            <span>AI-Powered</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Cards */}
                <div className="nav-cards-grid">

                    {/* Card 1: Chat */}
                    <button
                        onClick={() => onNavigate('chat')}
                        className="nav-card nav-card-chat"
                    >
                        <div className="nav-card-glow nav-card-glow-chat" />

                        <div className="nav-card-icon nav-card-icon-chat">
                            <MessageSquare size={28} />
                        </div>

                        <h3 className="nav-card-title">AI Chat Assistant</h3>
                        <p className="nav-card-desc">
                            Ask questions, solve equations, and generate complex plots using natural language.
                        </p>

                        <div className="nav-card-action nav-card-action-chat">
                            <span>Start Chatting</span>
                            <ArrowRight size={16} className="nav-card-arrow" />
                        </div>
                    </button>

                    {/* Card 2: Lab */}
                    <button
                        onClick={() => onNavigate('lab')}
                        className="nav-card nav-card-lab"
                    >
                        <div className="nav-card-glow nav-card-glow-lab" />

                        <div className="nav-card-icon nav-card-icon-lab">
                            <FlaskConical size={28} />
                        </div>

                        <h3 className="nav-card-title">Interactive Laboratory</h3>
                        <p className="nav-card-desc">
                            Dive into real-time simulations: Linear Algebra, Animation DSL, 4D Hypercubes, and more.
                        </p>

                        <div className="nav-card-action nav-card-action-lab">
                            <span>Enter Lab</span>
                            <ArrowRight size={16} className="nav-card-arrow" />
                        </div>
                    </button>

                </div>
            </div>

            {/* Footer */}
            <div className="home-footer">
                Powered by Gemini & Plotly â€¢ Math Agent Demo
            </div>
        </div>
    );
};

export default Home;
