import React, { useEffect, useRef } from 'react';

export default function InteractiveGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const mouse = { x: null, y: null, active: false };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
      mouse.active = false;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const gridSize = 45;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.002;

      // Draw Grid Lines
      ctx.lineWidth = 1;
      
      const cols = Math.ceil(width / gridSize) + 1;
      const rows = Math.ceil(height / gridSize) + 1;

      // Horizontal Lines
      for (let i = 0; i < rows; i++) {
        const y = i * gridSize;
        const offset = Math.sin(time + i) * 3; // subtle wave motion
        
        ctx.beginPath();
        ctx.moveTo(0, y + offset);
        ctx.lineTo(width, y + offset);

        if (mouse.active) {
          const dist = Math.abs(mouse.y - (y + offset));
          const opacity = Math.max(0.04, 0.22 - dist / 300);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        }
        ctx.stroke();
      }

      // Vertical Lines
      for (let j = 0; j < cols; j++) {
        const x = j * gridSize;
        const offset = Math.cos(time + j) * 3; // subtle wave motion

        ctx.beginPath();
        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, height);

        if (mouse.active) {
          const dist = Math.abs(mouse.x - (x + offset));
          const opacity = Math.max(0.04, 0.22 - dist / 300);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        }
        ctx.stroke();
      }

      // Draw glowing mouse cursor spotlight
      if (mouse.active) {
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Grid Intersections (Dots)
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = j * gridSize + Math.cos(time + j) * 3;
          const y = i * gridSize + Math.sin(time + i) * 3;

          let finalX = x;
          let finalY = y;
          let dotSize = 1.5;
          let dotOpacity = 0.25;

          if (mouse.active) {
            const dx = mouse.x - x;
            const dy = mouse.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Pull dots slightly towards mouse if they are within 150px
            if (dist < 150) {
              const force = (150 - dist) / 150;
              finalX += (dx / dist) * force * 10;
              finalY += (dy / dist) * force * 10;
              dotSize = 1.5 + force * 2.5;
              dotOpacity = 0.25 + force * 0.65;
              
              // Draw connection lines to mouse cursor
              if (dist < 110) {
                ctx.beginPath();
                ctx.moveTo(mouse.x, mouse.y);
                ctx.lineTo(finalX, finalY);
                ctx.strokeStyle = `rgba(255, 255, 255, ${(110 - dist) / 750})`;
                ctx.stroke();
              }
            }
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${dotOpacity})`;
          ctx.beginPath();
          ctx.arc(finalX, finalY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-10 pointer-events-auto"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
