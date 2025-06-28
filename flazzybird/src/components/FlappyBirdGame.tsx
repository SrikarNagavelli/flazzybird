import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Bird {
  x: number;
  y: number;
  velocity: number;
  rotation: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  velocity: { x: number; y: number };
  life: number;
  maxLife: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BIRD_SIZE = 30;
const PIPE_WIDTH = 80;
const PIPE_GAP = 200;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PIPE_SPEED = 3;

const FlappyBirdGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyBirdHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const gameStateRef = useRef<{
    bird: Bird;
    pipes: Pipe[];
    particles: Particle[];
  }>({
    bird: { x: 150, y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 },
    pipes: [],
    particles: []
  });

  const resetGame = useCallback(() => {
    gameStateRef.current = {
      bird: { x: 150, y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 },
      pipes: [],
      particles: []
    };
    setScore(0);
  }, []);

  const addParticles = useCallback((x: number, y: number, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      gameStateRef.current.particles.push({
        x,
        y,
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8 - 2
        },
        life: 30,
        maxLife: 30
      });
    }
  }, []);

  const generatePipe = useCallback((): Pipe => {
    const minHeight = 50;
    const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    return {
      x: CANVAS_WIDTH,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      passed: false
    };
  }, []);

  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    // Ground collision
    if (bird.y + BIRD_SIZE / 2 >= CANVAS_HEIGHT - 50) return true;
    
    // Ceiling collision
    if (bird.y - BIRD_SIZE / 2 <= 0) return true;

    // Pipe collision
    for (const pipe of pipes) {
      if (
        bird.x + BIRD_SIZE / 2 > pipe.x &&
        bird.x - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH
      ) {
        if (
          bird.y - BIRD_SIZE / 2 < pipe.topHeight ||
          bird.y + BIRD_SIZE / 2 > pipe.bottomY
        ) {
          return true;
        }
      }
    }
    
    return false;
  }, []);

  const jump = useCallback(() => {
    if (gameState === 'menu') {
      setGameState('playing');
      resetGame();
    } else if (gameState === 'playing') {
      gameStateRef.current.bird.velocity = JUMP_FORCE;
      addParticles(
        gameStateRef.current.bird.x - BIRD_SIZE / 2,
        gameStateRef.current.bird.y + BIRD_SIZE / 2,
        5
      );
    } else if (gameState === 'gameOver') {
      setGameState('playing');
      resetGame();
    }
  }, [gameState, resetGame, addParticles]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { bird, pipes, particles } = gameStateRef.current;

    if (gameState === 'playing') {
      // Update bird
      bird.velocity += GRAVITY;
      bird.y += bird.velocity;
      bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90);

      // Update pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED;

        // Check for scoring
        if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.passed = true;
          setScore(prev => prev + 1);
        }

        // Remove off-screen pipes
        if (pipe.x + PIPE_WIDTH < 0) {
          pipes.splice(i, 1);
        }
      }

      // Generate new pipes
      if (pipes.length === 0 || pipes[pipes.length - 1].x < CANVAS_WIDTH - 300) {
        pipes.push(generatePipe());
      }

      // Check collision
      if (checkCollision(bird, pipes)) {
        setGameState('gameOver');
        addParticles(bird.x, bird.y, 15);
        
        // Update high score
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('flappyBirdHighScore', score.toString());
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.velocity.y += 0.3; // Gravity for particles
      particle.life--;

      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw clouds
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) {
      const cloudX = (Date.now() * 0.01 + i * 160) % (CANVAS_WIDTH + 100) - 50;
      const cloudY = 50 + i * 30;
      
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 20, 0, Math.PI * 2);
      ctx.arc(cloudX + 25, cloudY, 25, 0, Math.PI * 2);
      ctx.arc(cloudX + 50, cloudY, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
    
    // Draw grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 10);

    // Draw pipes
    ctx.fillStyle = '#32CD32';
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Top pipe cap
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, PIPE_WIDTH + 10, 30);
      
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, CANVAS_HEIGHT - pipe.bottomY - 50);
      // Bottom pipe cap
      ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 30);
      
      // Pipe highlights
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(pipe.x + 5, 0, 5, pipe.topHeight);
      ctx.fillRect(pipe.x + 5, pipe.bottomY, 5, CANVAS_HEIGHT - pipe.bottomY - 50);
      ctx.fillStyle = '#32CD32';
    });

    // Draw particles
    particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate((bird.rotation * Math.PI) / 180);
    
    // Bird body
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(-5, -3, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(10, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(25, 3);
    ctx.lineTo(15, 6);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Draw UI
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    if (gameState === 'menu') {
      ctx.strokeText('Flappy Bird', CANVAS_WIDTH / 2, 150);
      ctx.fillText('Flappy Bird', CANVAS_WIDTH / 2, 150);
      
      ctx.font = 'bold 24px Arial';
      ctx.strokeText('Press SPACE or Click to Start', CANVAS_WIDTH / 2, 200);
      ctx.fillText('Press SPACE or Click to Start', CANVAS_WIDTH / 2, 200);
      
      ctx.strokeText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, 250);
      ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, 250);
    } else if (gameState === 'playing') {
      ctx.strokeText(score.toString(), CANVAS_WIDTH / 2, 80);
      ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 80);
    } else if (gameState === 'gameOver') {
      ctx.strokeText('Game Over', CANVAS_WIDTH / 2, 200);
      ctx.fillText('Game Over', CANVAS_WIDTH / 2, 200);
      
      ctx.font = 'bold 32px Arial';
      ctx.strokeText(`Score: ${score}`, CANVAS_WIDTH / 2, 250);
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, 250);
      
      ctx.strokeText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, 290);
      ctx.fillText(`High Score: ${highScore}`, CANVAS_WIDTH / 2, 290);
      
      ctx.font = 'bold 24px Arial';
      ctx.strokeText('Press SPACE or Click to Restart', CANVAS_WIDTH / 2, 350);
      ctx.fillText('Press SPACE or Click to Restart', CANVAS_WIDTH / 2, 350);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore, generatePipe, checkCollision, addParticles]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        jump();
      }
    };

    const handleClick = () => {
      jump();
    };

    window.addEventListener('keydown', handleKeyPress);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [jump]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block rounded cursor-pointer"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      <div className="text-white text-center">
        <p className="text-sm">Use SPACE bar or click to flap</p>
        <p className="text-xs opacity-80">Navigate through the pipes without touching them!</p>
      </div>
    </div>
  );
};

export default FlappyBirdGame;