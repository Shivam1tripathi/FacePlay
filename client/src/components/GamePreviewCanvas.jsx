import { useEffect, useRef } from 'react';
import { Maximize2, Minimize2, Square } from 'lucide-react';

const WORLD = {
  width: 960,
  height: 420,
  floor: 344
};

const INITIAL_GAME = {
  player: { x: 130, y: WORLD.floor - 48, width: 30, height: 48, vy: 0, invincible: 0 },
  bullets: [],
  threats: [],
  particles: [],
  scorePopups: [],
  score: 0,
  health: 100,
  displayedHealth: 100,
  maxHealth: 100,
  lives: 3,
  speed: 115,
  timeAlive: 0,
  spawnTimer: 1.45,
  shootFlash: 0,
  gameOver: false
};

export function GamePreviewCanvas({ controls, isRunning, isFullscreen, onToggleFullscreen, onStop }) {
  const canvasRef = useRef(null);
  const controlsRef = useRef(controls);
  const isRunningRef = useRef(isRunning);
  const gameRef = useRef(cloneGame());
  const smileLatchRef = useRef(false);
  const shootLatchRef = useRef(false);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) {
      gameRef.current = cloneGame();
      smileLatchRef.current = false;
      shootLatchRef.current = false;
    }
  }, [isRunning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    let frameId;
    let lastTime = performance.now();

    const render = (time) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (isRunningRef.current) {
        updateGame(gameRef.current, controlsRef.current, smileLatchRef, shootLatchRef, delta);
      }
      drawGame(context, canvas, gameRef.current, controlsRef.current, time, isRunningRef.current);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section className="preview-panel" aria-label="FacePilot runner shooter preview">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Game test</p>
          <h2>FacePilot arena</h2>
        </div>
        <button type="button" className="game-fullscreen-button" onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
        <button type="button" className="stop-game-button" onClick={onStop} disabled={!isRunning}>
          <Square size={16} />
          Stop game
        </button>
      </div>
      <canvas ref={canvasRef} className="game-preview" width={WORLD.width} height={WORLD.height} />
    </section>
  );
}

function updateGame(game, controls, smileLatchRef, shootLatchRef, delta) {
  if (game.gameOver) {
    if (controls.isSmiling || controls.didShoot) {
      Object.assign(game, cloneGame());
      shootLatchRef.current = false;
    }
    return;
  }

  const player = game.player;
  const move = controls.headDirection === 'Left' ? -1 : controls.headDirection === 'Right' ? 1 : 0;
  player.x = clamp(player.x + move * 190 * delta, 42, WORLD.width - 170);

  if (controls.isSmiling && !smileLatchRef.current && isGrounded(player)) {
    player.vy = -455;
    smileLatchRef.current = true;
    pushParticles(game, player.x + 18, player.y + 56, '#42d392', 8);
  }

  if (!controls.isSmiling) {
    smileLatchRef.current = false;
  }

  if (controls.didShoot && !shootLatchRef.current) {
    fireBulletBurst(game, player);
    game.shootFlash = 0.16;
    shootLatchRef.current = true;
  }

  if (!controls.didShoot && !controls.isShootCoolingDown) {
    shootLatchRef.current = false;
  }

  player.vy += 920 * delta;
  player.y += player.vy * delta;
  if (player.y > WORLD.floor - player.height) {
    player.y = WORLD.floor - player.height;
    player.vy = 0;
  }

  player.invincible = Math.max(0, player.invincible - delta);
  game.shootFlash = Math.max(0, game.shootFlash - delta);
  game.timeAlive += delta;
  game.speed = getGameSpeed(game.timeAlive);
  game.score += delta * (7 + game.timeAlive * 0.08);
  game.spawnTimer -= delta;

  if (game.spawnTimer <= 0) {
    spawnThreat(game);
    game.spawnTimer = getSpawnDelay(game.timeAlive);
  }

  for (const bullet of game.bullets) {
    bullet.x += bullet.speed * delta;
  }

  for (const threat of game.threats) {
    threat.x -= game.speed * threat.speedMultiplier * delta;
    if (threat.type === 'drone') {
      threat.y += Math.sin(performance.now() / 190 + threat.phase) * 22 * delta;
    }
    if (threat.type === 'laser') {
      threat.y = threat.baseY + Math.sin(performance.now() / 260 + threat.phase) * 18;
    }
  }

  for (const particle of game.particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
  }

  handleCollisions(game);
  game.bullets = game.bullets.filter((bullet) => bullet.x < WORLD.width + 40);
  game.threats = game.threats.filter((threat) => threat.x > -80);
  game.particles = game.particles.filter((particle) => particle.life > 0);
  game.scorePopups = game.scorePopups.filter((popup) => popup.life > 0);
}

function spawnThreat(game) {
  const type = pickThreatType(game.timeAlive);
  const threat = createThreat(type);
  game.threats.push(threat);
}

function getGameSpeed(timeAlive) {
  const earlyRamp = 115 + Math.min(timeAlive, 20) * 4.2;
  const lateRamp = Math.max(0, timeAlive - 20) * 2.6;
  return Math.min(310, earlyRamp + lateRamp);
}

function getSpawnDelay(timeAlive) {
  const maxDelay = Math.max(0.82, 1.75 - timeAlive * 0.018);
  const minDelay = Math.max(0.58, 1.15 - timeAlive * 0.012);
  return random(minDelay, maxDelay);
}

function pickThreatType(timeAlive) {
  const roll = Math.random();

  if (timeAlive < 12) {
    return roll < 0.72 ? 'barrier' : 'drone';
  }

  if (timeAlive < 28) {
    if (roll < 0.45) return 'barrier';
    if (roll < 0.75) return 'drone';
    return 'spike';
  }

  if (roll < 0.34) return 'barrier';
  if (roll < 0.58) return 'drone';
  if (roll < 0.82) return 'spike';
  return 'laser';
}

function createThreat(type) {
  const baseThreat = {
    type,
    x: WORLD.width + 30,
    phase: random(0, Math.PI * 2),
    speedMultiplier: 1
  };

  if (type === 'drone') {
    const baseY = random(WORLD.floor - 94, WORLD.floor - 58);
    return {
      ...baseThreat,
      y: baseY,
      baseY,
      width: 34,
      height: 25,
      speedMultiplier: 1.08
    };
  }

  if (type === 'spike') {
    return {
      ...baseThreat,
      y: WORLD.floor - 32,
      width: 38,
      height: 32,
      speedMultiplier: 0.95
    };
  }

  if (type === 'laser') {
    const baseY = random(176, 230);
    return {
      ...baseThreat,
      y: baseY,
      baseY,
      width: 72,
      height: 12,
      speedMultiplier: 1.18
    };
  }

  return {
    ...baseThreat,
    y: WORLD.floor - 42,
    width: 27,
    height: 42,
    speedMultiplier: 1
  };
}

function handleCollisions(game) {
  const playerBox = game.player;

  for (const bullet of game.bullets) {
    for (const threat of game.threats) {
      if (!threat.hit && intersects(bullet, threat)) {
        threat.hit = true;
        bullet.hitsLeft -= 1;
        bullet.hit = bullet.hitsLeft <= 0;
        const points = getThreatPoints(threat.type);
        game.score += points;
        game.scorePopups.push({
          x: threat.x + threat.width / 2,
          y: threat.y - 8,
          value: points,
          life: 0.8,
          maxLife: 0.8
        });
        pushParticles(game, threat.x + threat.width / 2, threat.y + threat.height / 2, '#ffcf5a', 12);
      }
    }
  }

  game.bullets = game.bullets.filter((bullet) => !bullet.hit);
  game.threats = game.threats.filter((threat) => !threat.hit);

  for (const threat of game.threats) {
    if (game.player.invincible <= 0 && intersects(playerBox, threat)) {
      game.health = Math.max(0, game.health - 25);
      game.player.invincible = 1.1;
      threat.hit = true;
      pushParticles(game, playerBox.x + 16, playerBox.y + 28, '#ff6978', 18);

      if (game.health <= 0) {
        game.lives -= 1;
        if (game.lives > 0) {
          game.health = game.maxHealth;
          game.displayedHealth = game.maxHealth;
        }
        pushParticles(game, playerBox.x + 18, playerBox.y + 24, '#ffcf5a', 24);

        if (game.lives <= 0) {
          game.gameOver = true;
        }
      }
    }
  }

  game.threats = game.threats.filter((threat) => !threat.hit);
}

function fireBulletBurst(game, player) {
  const offsets = [-12, -4, 4, 12];

  for (const offset of offsets) {
    game.bullets.push({
      x: player.x + player.width,
      y: player.y + 22 + offset,
      width: 15,
      height: 5,
      speed: 520,
      hitsLeft: 2
    });
  }
}

function drawGame(context, canvas, game, controls, time, isRunning) {
  game.displayedHealth += (game.health - game.displayedHealth) * 0.12;
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawWorld(context, canvas, time, game.speed);
  drawThreats(context, game.threats);
  drawBullets(context, game.bullets);
  drawPlayer(context, game.player, controls, game.shootFlash);
  drawParticles(context, game.particles);
  drawScorePopups(context, game.scorePopups);
  drawHud(context, game, controls);

  if (game.gameOver) {
    drawGameOver(context, canvas);
  }

  if (!isRunning) {
    drawStopped(context, canvas);
  }
}

function drawWorld(context, canvas, time, speed) {
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#101a26');
  sky.addColorStop(0.6, '#152438');
  sky.addColorStop(1, '#10141b');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(106, 230, 255, 0.08)';
  for (let i = 0; i < 7; i += 1) {
    const x = (i * 170 - (time * 0.018) % 170 + canvas.width) % canvas.width;
    context.fillRect(x, 74 + i * 18, 94, 3);
  }

  context.fillStyle = '#202b3b';
  context.fillRect(0, WORLD.floor, canvas.width, canvas.height - WORLD.floor);
  context.fillStyle = '#42d392';
  context.fillRect(0, WORLD.floor, canvas.width, 4);

  context.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  context.lineWidth = 2;
  const stride = 58;
  const offset = (time * speed * 0.001) % stride;
  for (let x = -stride; x < canvas.width + stride; x += stride) {
    context.beginPath();
    context.moveTo(x - offset, WORLD.floor + 28);
    context.lineTo(x + 30 - offset, WORLD.floor + 28);
    context.stroke();
  }
}

function drawPlayer(context, player, controls, shootFlash) {
  const flicker = player.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  if (flicker) return;

  const suitColor = controls.faceDetected ? '#6ae6ff' : '#7b8494';
  const accentColor = controls.isSmiling ? '#42d392' : '#ffcf5a';
  const centerX = player.x + player.width / 2;

  context.save();
  context.shadowColor = controls.faceDetected ? 'rgba(106, 230, 255, 0.42)' : 'rgba(123, 132, 148, 0.24)';
  context.shadowBlur = 16;

  context.fillStyle = 'rgba(66, 211, 146, 0.18)';
  context.beginPath();
  context.ellipse(centerX, player.y + player.height + 4, 28, 7, 0, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 0;
  context.fillStyle = '#162033';
  roundedRect(context, player.x + 3, player.y + 7, player.width - 6, player.height - 4, 10);
  context.fill();

  context.fillStyle = suitColor;
  roundedRect(context, player.x + 7, player.y + 12, player.width - 14, player.height - 16, 7);
  context.fill();

  context.fillStyle = '#0d1320';
  roundedRect(context, player.x + 10, player.y + 20, player.width - 20, 15, 5);
  context.fill();

  context.fillStyle = accentColor;
  context.fillRect(centerX - 2, player.y + 16, 4, 24);

  context.fillStyle = '#10141b';
  roundedRect(context, player.x - 1, player.y + 19, 8, 20, 4);
  context.fill();
  roundedRect(context, player.x + player.width - 7, player.y + 19, 15, 8, 4);
  context.fill();

  context.fillStyle = '#ffcf5a';
  roundedRect(context, player.x + player.width + 4, player.y + 20, 18, 6, 3);
  context.fill();

  context.fillStyle = '#eaf7ff';
  context.beginPath();
  context.arc(centerX, player.y - 5, 15, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#10141b';
  context.beginPath();
  context.arc(centerX, player.y - 5, 11, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = controls.faceDetected ? '#6ae6ff' : '#a3afbf';
  roundedRect(context, centerX - 9, player.y - 10, 18, 7, 4);
  context.fill();

  context.strokeStyle = accentColor;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centerX, player.y - 1, 6, 0.2, Math.PI - 0.2);
  context.stroke();

  context.fillStyle = '#0d1320';
  roundedRect(context, player.x + 5, player.y + player.height - 5, 9, 9, 4);
  context.fill();
  roundedRect(context, player.x + player.width - 14, player.y + player.height - 5, 9, 9, 4);
  context.fill();

  context.fillStyle = '#42d392';
  context.fillRect(player.x + 8, player.y + player.height + 2, 5, 8);
  context.fillRect(player.x + player.width - 12, player.y + player.height + 2, 5, 8);

  if (shootFlash > 0) {
    context.fillStyle = 'rgba(255, 207, 90, 0.95)';
    roundedRect(context, player.x + player.width + 22, player.y + 20, 66, 5, 3);
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(player.x + player.width + 24, player.y + 21, 22, 2);
  }

  context.restore();
}

function drawThreats(context, threats) {
  for (const threat of threats) {
    if (threat.type === 'drone') {
      context.fillStyle = '#ff6978';
      roundedRect(context, threat.x, threat.y, threat.width, threat.height, 8);
      context.fill();
      context.fillStyle = '#10141b';
      context.fillRect(threat.x + 9, threat.y + 10, 24, 5);
      context.fillStyle = '#ffcf5a';
      context.fillRect(threat.x - 8, threat.y + 12, 8, 4);
      context.fillRect(threat.x + threat.width, threat.y + 12, 8, 4);
    } else if (threat.type === 'spike') {
      context.fillStyle = '#ff6978';
      context.beginPath();
      context.moveTo(threat.x, threat.y + threat.height);
      context.lineTo(threat.x + threat.width * 0.33, threat.y + 6);
      context.lineTo(threat.x + threat.width * 0.5, threat.y + threat.height);
      context.lineTo(threat.x + threat.width * 0.72, threat.y);
      context.lineTo(threat.x + threat.width, threat.y + threat.height);
      context.closePath();
      context.fill();

      context.fillStyle = 'rgba(255, 255, 255, 0.55)';
      context.fillRect(threat.x + 8, threat.y + 20, 18, 3);
    } else if (threat.type === 'laser') {
      context.fillStyle = 'rgba(255, 105, 120, 0.22)';
      roundedRect(context, threat.x - 8, threat.y - 8, threat.width + 16, threat.height + 16, 10);
      context.fill();

      context.fillStyle = '#ff6978';
      roundedRect(context, threat.x, threat.y, threat.width, threat.height, 6);
      context.fill();

      context.fillStyle = '#f4f7fb';
      context.fillRect(threat.x + 8, threat.y + 4, threat.width - 16, 3);
    } else {
      context.fillStyle = '#ffcf5a';
      roundedRect(context, threat.x, threat.y, threat.width, threat.height, 7);
      context.fill();
      context.fillStyle = 'rgba(16, 20, 27, 0.42)';
      context.fillRect(threat.x + 7, threat.y + 8, 5, 36);
      context.fillRect(threat.x + 20, threat.y + 8, 5, 36);
    }
  }
}

function drawBullets(context, bullets) {
  context.fillStyle = '#42d392';
  for (const bullet of bullets) {
    roundedRect(context, bullet.x, bullet.y, bullet.width, bullet.height, 4);
    context.fill();
  }
}

function drawParticles(context, particles) {
  for (const particle of particles) {
    context.globalAlpha = Math.max(particle.life / particle.maxLife, 0);
    context.fillStyle = particle.color;
    context.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  context.globalAlpha = 1;
}

function drawScorePopups(context, scorePopups) {
  context.font = '900 18px Inter, sans-serif';
  context.textAlign = 'center';

  for (const popup of scorePopups) {
    popup.y -= 0.85;
    popup.life -= 1 / 60;
    context.globalAlpha = Math.max(popup.life / popup.maxLife, 0);
    context.fillStyle = '#ffcf5a';
    context.fillText(`+${popup.value}`, popup.x, popup.y);
  }

  context.globalAlpha = 1;
  context.textAlign = 'left';
}

function drawHud(context, game, controls) {
  context.fillStyle = 'rgba(8, 12, 18, 0.62)';
  roundedRect(context, 20, 18, 330, 156, 8);
  context.fill();

  context.fillStyle = '#f4f7fb';
  context.font = '900 22px Inter, sans-serif';
  context.fillText(`Score ${Math.floor(game.score)}`, 38, 50);

  context.font = '800 14px Inter, sans-serif';
  context.fillStyle = '#a3afbf';
  context.fillText('Lives', 38, 78);
  drawLives(context, 88, 68, game.lives);

  context.fillStyle = '#f4f7fb';
  context.font = '900 13px Inter, sans-serif';
  context.fillText('Health', 38, 104);

  const barX = 96;
  const barY = 91;
  const barWidth = 196;
  const barHeight = 18;
  const healthRatio = Math.max(0, game.displayedHealth / game.maxHealth);

  context.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundedRect(context, barX, barY, barWidth, barHeight, 7);
  context.fill();

  context.strokeStyle = 'rgba(244, 247, 251, 0.55)';
  context.lineWidth = 2;
  roundedRect(context, barX, barY, barWidth, barHeight, 7);
  context.stroke();

  context.fillStyle = game.displayedHealth > 60 ? '#42d392' : game.displayedHealth > 30 ? '#ffcf5a' : '#ff6978';
  roundedRect(context, barX + 3, barY + 3, Math.max(4, (barWidth - 6) * healthRatio), barHeight - 6, 5);
  context.fill();

  context.fillStyle = '#f4f7fb';
  context.font = '900 12px Inter, sans-serif';
  context.fillText(`${Math.ceil(game.displayedHealth)}%`, 302, 105);

  drawTimingBar(context, 38, 126, game.timeAlive);

  const action = controls.didShoot
    ? 'Mouth shot'
    : controls.isSmiling
      ? 'Smile jump'
      : controls.headDirection !== 'Center'
        ? `Move ${controls.headDirection}`
        : 'Hold center';

  context.fillStyle = '#42d392';
  context.font = '800 14px Inter, sans-serif';
  context.fillText(action, WORLD.width - 170, 42);

  context.fillStyle = '#a3afbf';
  context.fillText(`Speed ${Math.round(game.speed)}`, WORLD.width - 170, 66);
}

function drawTimingBar(context, x, y, timeAlive) {
  const phaseLength = 30;
  const phaseProgress = (timeAlive % phaseLength) / phaseLength;
  const width = 254;
  const height = 12;

  context.fillStyle = '#f4f7fb';
  context.font = '900 12px Inter, sans-serif';
  context.fillText(`Time ${formatTime(timeAlive)}`, x, y);

  context.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundedRect(context, x, y + 10, width, height, 6);
  context.fill();

  context.fillStyle = '#6ae6ff';
  roundedRect(context, x + 3, y + 13, Math.max(5, (width - 6) * phaseProgress), height - 6, 4);
  context.fill();
}

function formatTime(timeAlive) {
  const minutes = Math.floor(timeAlive / 60);
  const seconds = Math.floor(timeAlive % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function drawLives(context, x, y, lives) {
  for (let index = 0; index < 3; index += 1) {
    context.fillStyle = index < lives ? '#ff6978' : 'rgba(255, 255, 255, 0.16)';
    context.beginPath();
    context.arc(x + index * 24, y, 8, 0, Math.PI * 2);
    context.fill();
  }
}

function drawGameOver(context, canvas) {
  context.fillStyle = 'rgba(8, 12, 18, 0.74)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f4f7fb';
  context.textAlign = 'center';
  context.font = '900 42px Inter, sans-serif';
  context.fillText('Signal lost', canvas.width / 2, canvas.height / 2 - 20);
  context.font = '800 18px Inter, sans-serif';
  context.fillStyle = '#a3afbf';
  context.fillText('Smile or open mouth to restart', canvas.width / 2, canvas.height / 2 + 22);
  context.textAlign = 'left';
}

function drawStopped(context, canvas) {
  context.fillStyle = 'rgba(8, 12, 18, 0.68)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f4f7fb';
  context.textAlign = 'center';
  context.font = '900 34px Inter, sans-serif';
  context.fillText('Camera off', canvas.width / 2, canvas.height / 2 - 12);
  context.font = '800 17px Inter, sans-serif';
  context.fillStyle = '#a3afbf';
  context.fillText('Start camera to play FacePilot', canvas.width / 2, canvas.height / 2 + 26);
  context.textAlign = 'left';
}

function pushParticles(game, x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    game.particles.push({
      x,
      y,
      vx: random(-140, 140),
      vy: random(-180, 80),
      size: random(3, 7),
      life: random(0.28, 0.7),
      maxLife: 0.7,
      color
    });
  }
}

function cloneGame() {
  return {
    ...INITIAL_GAME,
    player: { ...INITIAL_GAME.player },
    bullets: [],
    threats: [],
    particles: [],
    scorePopups: []
  };
}

function getThreatPoints(type) {
  if (type === 'laser') return 70;
  if (type === 'spike') return 60;
  if (type === 'drone') return 50;
  return 40;
}

function isGrounded(player) {
  return player.y >= WORLD.floor - player.height - 0.5;
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
