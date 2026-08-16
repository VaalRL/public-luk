"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    angle: number;
    velocity: number;
}

export function FireworksAnimation() {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [bursts, setBursts] = useState(0);

    useEffect(() => {
        const colors = [
            "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
            "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739"
        ];

        const createBurst = (centerX: number, centerY: number) => {
            const newParticles: Particle[] = [];
            const particleCount = 30 + Math.random() * 20;

            for (let i = 0; i < particleCount; i++) {
                newParticles.push({
                    id: Date.now() + i,
                    x: centerX,
                    y: centerY,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    angle: (Math.PI * 2 * i) / particleCount,
                    velocity: 2 + Math.random() * 3,
                });
            }

            setParticles((prev) => [...prev, ...newParticles]);

            setTimeout(() => {
                setParticles((prev) =>
                    prev.filter((p) => !newParticles.find((np) => np.id === p.id))
                );
            }, 1500);
        };

        const burstInterval = setInterval(() => {
            if (bursts < 8) {
                const x = 20 + Math.random() * 60;
                const y = 20 + Math.random() * 40;
                createBurst(x, y);
                setBursts((prev) => prev + 1);
            }
        }, 300);

        const timeout = setTimeout(() => {
            clearInterval(burstInterval);
        }, 3000);

        return () => {
            clearInterval(burstInterval);
            clearTimeout(timeout);
        };
    }, [bursts]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: particle.color,
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            boxShadow: `0 0 10px ${particle.color}`,
                        }}
                        initial={{
                            scale: 0,
                            opacity: 1,
                        }}
                        animate={{
                            x: Math.cos(particle.angle) * particle.velocity * 100,
                            y: Math.sin(particle.angle) * particle.velocity * 100 + 50,
                            scale: [1, 1.5, 0],
                            opacity: [1, 0.8, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            ease: "easeOut",
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
