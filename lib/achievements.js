export const ACHIEVEMENTS = [
  { id: 'first_win',      title: 'First Blood',      desc: 'Win your first game',          xp: 50,  icon: '🏆' },
  { id: 'win_5',          title: 'On a Roll',         desc: 'Win 5 games total',            xp: 100, icon: '🎯' },
  { id: 'win_25',         title: 'Veteran',           desc: 'Win 25 games',                 xp: 250, icon: '⭐' },
  { id: 'win_100',        title: 'Legend',            desc: 'Win 100 games',                xp: 500, icon: '👑' },
  { id: 'play_all',       title: 'Explorer',          desc: 'Play every game at least once',xp: 200, icon: '🗺️' },
  { id: 'play_10',        title: 'Gamer',             desc: 'Play 10 games total',          xp: 75,  icon: '🎮' },
  { id: 'play_50',        title: 'Dedicated',         desc: 'Play 50 games',                xp: 150, icon: '💪' },
  { id: 'snake_long',     title: 'Sssupreme',         desc: 'Reach length 20 in Snake',     xp: 100, icon: '🐍' },
  { id: 'pong_shutout',   title: 'Shutout',           desc: 'Win Pong without conceding',   xp: 150, icon: '🏓' },
  { id: 'breakout_clear', title: 'Brick Destroyer',   desc: 'Clear the board in Breakout',  xp: 200, icon: '🧱' },
  { id: 'memory_perfect', title: 'Photographic',      desc: 'Win Memory Match with no fails',xp:150, icon: '🃏' },
  { id: 'space_boss',     title: 'Boss Slayer',       desc: 'Defeat the Space Shooter boss',xp: 300, icon: '🚀' },
  { id: 'ttt_perfect',    title: 'Unbeatable',        desc: 'Win Tic Tac Toe on Hard AI',   xp: 200, icon: '⭕' },
  { id: 'tank_ace',       title: 'Tank Ace',          desc: 'Destroy 3 AI tanks in one game',xp:200, icon: '🪖' },
  { id: 'level_5',        title: 'Level 5',           desc: 'Reach player level 5',         xp: 0,   icon: '5️⃣' },
  { id: 'level_10',       title: 'Level 10',          desc: 'Reach player level 10',        xp: 0,   icon: '🔟' },
  { id: 'daily_1',        title: 'Daily Grinder',     desc: 'Complete a daily challenge',   xp: 100, icon: '📅' },
  { id: 'daily_7',        title: 'Week Streak',       desc: 'Complete 7 daily challenges',  xp: 500, icon: '🔥' },
];

export const getAchievement = (id) => ACHIEVEMENTS.find(a => a.id === id);

export const DAILY_CHALLENGES = [
  { id: 'dc_ttt',    game: 'tic-tac-toe',         desc: 'Beat Hard AI in Tic Tac Toe',          target: 1  },
  { id: 'dc_snake',  game: 'snake',                desc: 'Reach score 10 in Snake',              target: 10 },
  { id: 'dc_pong',   game: 'pong',                 desc: 'Win a Pong match',                     target: 1  },
  { id: 'dc_break',  game: 'breakout',             desc: 'Score 500 in Breakout',                target: 500},
  { id: 'dc_memory', game: 'memory-match',         desc: 'Complete Memory Match under 60s',      target: 60 },
  { id: 'dc_space',  game: 'space-shooter',        desc: 'Survive 3 waves in Space Shooter',     target: 3  },
  { id: 'dc_bomb',   game: 'bomber-arena',         desc: 'Eliminate an AI in Bomber Arena',      target: 1  },
];

export function getTodayChallenge() {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}
