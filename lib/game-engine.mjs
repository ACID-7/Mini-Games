const MODE_META = {
  last_message: { name: 'Last Message', summary: 'One player gets a slightly different disaster prompt. Everyone writes a final message and votes on the odd player.' },
  rule_breaker: { name: 'Rule Breaker', summary: 'Everyone follows a hidden rule except one outsider. The outsider tries to guess the rule while others identify them.' },
  fake_internet: { name: 'Fake Internet', summary: 'Write fake posts that blend in with one real internet post. Vote for the real one and fool your friends.' },
  chain_reaction: { name: 'Chain Reaction', summary: 'Transform a sentence one word at a time. Players vote for the funniest or smartest change.' },
  secret_objective: { name: 'Secret Objective', summary: 'Each player has a hidden mission during chat. Complete it quietly and guess someone else\'s mission.' },
  speed_lies: { name: 'Speed Lies', summary: 'Answer fast. Some players tell the truth, others lie. Vote for who was bluffing.' },
  voice_swap: { name: 'Voice Swap', summary: 'Record short voice clips, shuffle them, and guess who said what.' },
  one_word_story_war: { name: 'One Word Story War', summary: 'Build a story one word at a time while secretly steering it toward your assigned theme.' },
  suspicious_one: { name: 'The Suspicious One', summary: 'One player gets a modified answer style. Everyone submits a response and hunts the suspicious player.' },
  memory_trap: { name: 'Memory Trap', summary: 'Earlier answers return later with one subtle fake. Spot the altered memory.' }
};

const LAST_MESSAGE_PROMPTS = [
  { normal: 'You are on a spaceship with 30 seconds of oxygen left.', odd: 'You are trapped in a submarine with 30 seconds of oxygen left.' },
  { normal: 'A volcano is erupting outside your cabin.', odd: 'A giant snowstorm has buried your mountain cabin.' },
  { normal: 'Your haunted hotel elevator is stuck between floors.', odd: 'Your stranded carnival ferris wheel is frozen at the top.' },
  { normal: 'You are escaping a collapsing ancient temple.', odd: 'You are escaping a collapsing underground lab.' },
  { normal: 'A meteor is about to hit your tiny town.', odd: 'A giant monster is about to step on your tiny town.' }
];

const RULE_BANK = [
  { rule: 'Include a color in every answer.', distractors: ['Answer like a pirate.', 'End every answer with a question.', 'Mention food in every answer.'], prompts: ['How was your morning?', 'Describe your ideal vacation.', 'What would you do with a surprise day off?'] },
  { rule: 'Answer like a pirate.', distractors: ['Use only very short sentences.', 'Include a color in every answer.', 'Mention weather in every answer.'], prompts: ['What is your dream job?', 'Describe your favorite snack.', 'How would you survive on an island?'] },
  { rule: 'Mention food in every answer.', distractors: ['Speak like a robot.', 'Ask a question back every time.', 'Use one dramatic adjective in every answer.'], prompts: ['Tell us about your weekend.', 'What scares you the most?', 'How would you decorate a castle?'] },
  { rule: 'End every answer with a question.', distractors: ['Use a color in every answer.', 'Mention a celebrity every time.', 'Answer in exactly five words.'], prompts: ['What do you want for dinner?', 'How do you relax after work?', 'What is your perfect pet?'] },
  { rule: 'Use one dramatic adjective in every answer.', distractors: ['Include a number in every answer.', 'Speak like a pirate.', 'Mention food in every answer.'], prompts: ['What makes a great party?', 'Describe a bad date.', 'What would you bring to a picnic?'] }
];

const FAKE_INTERNET_BANK = [
  { category: 'Weird product review', real: 'Five stars. My cat looked at this blender once and now behaves like middle management.' },
  { category: 'Absurd startup slogan', real: 'We disrupt hydration by delivering artisanal water experiences to your workflow.' },
  { category: 'Chaotic forum post title', real: 'Help, my landlord thinks the pigeon on my balcony is a subtenant.' },
  { category: 'Terrible dating bio', real: 'Emotionally available on Tuesdays. I make soup and questionable decisions.' },
  { category: 'Local news headline', real: 'Town council delayed by goose occupying the mayor\'s parking space.' },
  { category: 'Conspiracy tweet', real: 'Why do all hotel carpets look like they know something about 1997?' }
];

const BASE_SENTENCES = [
  'I saw a cat in the park.',
  'The chef made soup for lunch.',
  'My neighbor bought a tiny boat yesterday.',
  'The queen invited a clown to dinner.',
  'A wizard opened a bakery downtown.'
];

const SECRET_OBJECTIVES = [
  'Get someone to say "why".',
  'Mention food three times naturally.',
  'Ask two questions in a row.',
  'Make someone laugh.',
  'Use the same unusual word twice.',
  'Mention a movie without naming it directly.',
  'Convince someone to agree with you.',
  'Say the word "mystery" casually.',
  'Interrupt the flow by changing the topic once.',
  'Get someone to repeat a word you used.'
];

const CHAT_PROMPTS = [
  'What would make tonight unexpectedly legendary?',
  'Describe the worst possible vacation in a fun way.',
  'If your group had a mascot, what would it be?',
  'What harmless thing would become terrifying at 3 a.m.?',
  'Invent a new holiday tradition for your friend group.'
];

const SPEED_PROMPTS = [
  'Why were you late?',
  'What is the weirdest thing in your bag?',
  'What did you break as a child?',
  'What would you hide from your future self?',
  'What would you do with a million dollars in one hour?',
  'What is the most suspicious thing you have ever said out of context?'
];

const VOICE_PROMPTS = [
  'Give a dramatic apology for stealing the moon.',
  'Order coffee like a fantasy villain.',
  'Say a completely normal sentence as if the world is ending.',
  'Leave a voicemail from the future.',
  'Introduce yourself as a detective who only solves sandwich crimes.'
];

const STORY_STARTS = [
  'Once upon a midnight',
  'In the kingdom of socks',
  'During a suspicious picnic',
  'At the edge of the internet',
  'Inside the underground disco'
];

const STORY_ROLES = [
  'Push the story toward horror.',
  'Push the story toward romance.',
  'Push the story toward science fiction.',
  'Push the story toward courtroom drama.',
  'Push the story toward pure nonsense.',
  'Keep the story surprisingly wholesome.'
];

const SUSPICIOUS_PROMPTS = [
  { base: 'Describe your ideal weekend.', suspicious: 'Describe your ideal weekend like a supervillain.' },
  { base: 'What would you bring to a picnic?', suspicious: 'Answer like a robot choosing picnic supplies.' },
  { base: 'Describe a perfect birthday party.', suspicious: 'Answer like a conspiracy theorist planning a birthday.' },
  { base: 'How would you spend a rainy day?', suspicious: 'Answer like a melodramatic actor spending a rainy day.' },
  { base: 'Describe your dream pet.', suspicious: 'Answer like a pirate describing a dream pet.' }
];

const MEMORY_PROMPTS = [
  'Name a country you want to visit.',
  'What is your favorite snack?',
  'What animal would you be?',
  'Name a place you would hide during a zombie outbreak.',
  'Pick one object you would bring to a desert island.',
  'Name a movie you pretend not to like.'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(arr, count) {
  return shuffle(arr).slice(0, count);
}

function repeatSample(arr, count) {
  const result = [];
  while (result.length < count) {
    result.push(...shuffle(arr));
  }
  return result.slice(0, count);
}

function safeText(value, max = 220) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function makeId(prefix = 'p') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function makeCode(store) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    if (!(await store.roomExists(code))) return code;
  }
}

function getPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId);
}

function hasPlayerName(room, name) {
  const normalizedName = safeText(name, 20).toLowerCase();
  if (!normalizedName) return false;
  return room.players.some((player) => player.name.toLowerCase() === normalizedName);
}

function ensureHost(room, playerId) {
  if (room.hostId !== playerId) throw new Error('Only the host can do that.');
}

function ensureDifferentPlayer(playerId, targetId, message = 'You cannot target yourself.') {
  if (playerId === targetId) throw new Error(message);
}

function playerOrder(room) {
  return room.players.map((player) => player.id);
}

function resetScores(room) {
  room.players.forEach((player) => {
    player.score = 0;
  });
}

function addScore(room, playerId, points) {
  const player = getPlayer(room, playerId);
  if (player) player.score += points;
}

function buildWinnerBanner(room) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  return top ? `${top.name} wins with ${top.score} point${top.score === 1 ? '' : 's'}!` : 'Game over.';
}

function buildActionState(room, viewerId) {
  const gs = room.gameState || {};
  const state = {
    submitted: false,
    voted: false,
    guessed: false,
    canEdit: true,
    canAdvance: room.hostId === viewerId && room.status !== 'lobby' && room.phase !== 'game_over'
  };

  switch (room.mode) {
    case 'last_message':
    case 'suspicious_one':
      state.submitted = Boolean(gs.submissions?.[viewerId]);
      state.voted = Boolean(gs.votes?.[viewerId]);
      break;
    case 'rule_breaker':
      state.submitted = Boolean(gs.answersByPrompt?.[`p${gs.currentPromptIndex}`]?.[viewerId]);
      state.voted = Boolean(gs.votes?.[viewerId]);
      state.guessed = gs.outsiderId === viewerId && Boolean(gs.outsiderGuess);
      break;
    case 'fake_internet':
      state.submitted = Boolean(gs.fakePosts?.[viewerId]);
      state.voted = Boolean(gs.votes?.[viewerId]);
      break;
    case 'chain_reaction':
      state.submitted = Boolean(gs.history?.some((item) => item.playerId === viewerId));
      state.voted = Boolean(gs.votes?.[viewerId]);
      state.canEdit = gs.turnOrder?.[gs.turnIndex] === viewerId;
      break;
    case 'secret_objective':
      state.submitted = Boolean(gs.chat?.length);
      state.guessed = Boolean(gs.guesses?.[viewerId]);
      break;
    case 'speed_lies':
      state.submitted = Boolean(gs.answers?.[viewerId]);
      state.voted = Boolean(gs.votes?.[viewerId]);
      break;
    case 'voice_swap':
      state.submitted = viewerId in (gs.recordings || {});
      state.guessed = Boolean(gs.guesses?.[viewerId]);
      break;
    case 'one_word_story_war':
      state.submitted = Boolean(gs.additions?.some((item) => item.playerId === viewerId));
      state.voted = Boolean(gs.votes?.[viewerId]);
      state.canEdit = gs.turnOrder?.[gs.turnIndex] === viewerId;
      break;
    case 'memory_trap':
      state.submitted = Boolean(gs.answersByPlayer?.[viewerId]?.[gs.currentPromptIndex]);
      state.voted = Boolean(gs.votes?.[viewerId]);
      break;
    default:
      break;
  }

  return state;
}

function diffOneWord(before, after) {
  const a = before.trim().split(/\s+/);
  const b = after.trim().split(/\s+/);

  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) diff += 1;
  }

  return diff === 1;
}

function alterAnswer(text) {
  const replacements = {
    cat: 'dragon',
    dog: 'goose',
    beach: 'moon',
    park: 'volcano',
    snack: 'brick',
    island: 'office',
    pizza: 'pickles',
    coffee: 'lava',
    tiger: 'pigeon',
    castle: 'parking lot',
    soup: 'glitter'
  };

  let words = safeText(text, 120).split(' ');
  if (!words[0]) return 'mystery';

  let changed = false;
  words = words.map((word) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!changed && replacements[clean]) {
      changed = true;
      return word.replace(clean, replacements[clean]);
    }
    return word;
  });

  if (!changed) {
    const index = Math.min(words.length - 1, Math.max(0, Math.floor(words.length / 2)));
    words[index] = `${words[index]} but haunted`;
  }

  return words.join(' ');
}

function ensureEntriesFromSubmissions(room, sourceKey) {
  const entries = room.players.map((player, index) => ({
    entryId: `e${index + 1}`,
    playerId: player.id,
    text: room.gameState[sourceKey][player.id] || '(no response)'
  }));

  room.gameState.entries = shuffle(entries);
}

function initRound(room) {
  const ids = playerOrder(room);

  switch (room.mode) {
    case 'last_message': {
      const pair = randomChoice(LAST_MESSAGE_PROMPTS);
      room.phase = 'writing';
      room.banner = `Round ${room.currentRound}/${room.rounds}: write your last message.`;
      room.gameState = { pair, oddPlayerId: randomChoice(ids), submissions: {}, entries: [], votes: {}, scored: false };
      break;
    }
    case 'rule_breaker': {
      const pack = randomChoice(RULE_BANK);
      room.phase = 'prompting';
      room.banner = `Round ${room.currentRound}/${room.rounds}: answer the prompts without exposing the rule.`;
      room.gameState = {
        pack,
        outsiderId: randomChoice(ids),
        currentPromptIndex: 0,
        answersByPrompt: {},
        outsiderGuess: '',
        outsiderGuessCorrect: false,
        votes: {},
        scored: false,
        options: shuffle([pack.rule, ...pack.distractors])
      };
      break;
    }
    case 'fake_internet': {
      const item = randomChoice(FAKE_INTERNET_BANK);
      room.phase = 'writing';
      room.banner = `Round ${room.currentRound}/${room.rounds}: create a fake ${item.category.toLowerCase()}.`;
      room.gameState = { item, fakePosts: {}, entries: [], votes: {}, scored: false };
      break;
    }
    case 'chain_reaction': {
      room.phase = 'editing';
      room.banner = `Round ${room.currentRound}/${room.rounds}: change exactly one word on your turn.`;
      room.gameState = {
        baseSentence: randomChoice(BASE_SENTENCES),
        currentSentence: '',
        turnOrder: ids,
        turnIndex: 0,
        history: [],
        votes: {},
        scored: false
      };
      room.gameState.currentSentence = room.gameState.baseSentence;
      break;
    }
    case 'secret_objective': {
      const objectives = repeatSample(SECRET_OBJECTIVES, room.players.length);
      const assignment = {};
      room.players.forEach((player, index) => {
        assignment[player.id] = objectives[index];
      });
      room.phase = 'interaction';
      room.banner = `Round ${room.currentRound}/${room.rounds}: chat naturally and complete your secret objective.`;
      room.gameState = { prompt: randomChoice(CHAT_PROMPTS), assignment, chat: [], guesses: {}, completionClaims: {}, scored: false };
      break;
    }
    case 'speed_lies': {
      const assignment = {};
      const liars = new Set(sample(ids, Math.max(1, Math.floor(ids.length / 2))));
      room.players.forEach((player) => {
        assignment[player.id] = liars.has(player.id) ? 'lie' : 'truth';
      });
      room.phase = 'answering';
      room.banner = `Round ${room.currentRound}/${room.rounds}: answer quickly and convincingly.`;
      room.gameState = { prompt: randomChoice(SPEED_PROMPTS), assignment, answers: {}, votes: {}, scored: false };
      break;
    }
    case 'voice_swap': {
      room.phase = 'recording';
      room.banner = `Round ${room.currentRound}/${room.rounds}: record a short voice clip.`;
      room.gameState = { prompt: randomChoice(VOICE_PROMPTS), recordings: {}, entries: [], guesses: {}, scored: false };
      break;
    }
    case 'one_word_story_war': {
      const roles = {};
      const sampledRoles = repeatSample(STORY_ROLES, room.players.length);
      room.players.forEach((player, index) => {
        roles[player.id] = sampledRoles[index];
      });
      room.phase = 'editing';
      room.banner = `Round ${room.currentRound}/${room.rounds}: add one word at a time and shape the story.`;
      room.gameState = {
        start: randomChoice(STORY_STARTS),
        storyWords: [],
        additions: [],
        turnOrder: ids,
        turnIndex: 0,
        roles,
        votes: {},
        scored: false
      };
      break;
    }
    case 'suspicious_one': {
      const pack = randomChoice(SUSPICIOUS_PROMPTS);
      room.phase = 'writing';
      room.banner = `Round ${room.currentRound}/${room.rounds}: answer the prompt without looking suspicious.`;
      room.gameState = { pack, suspiciousId: randomChoice(ids), submissions: {}, entries: [], votes: {}, scored: false };
      break;
    }
    case 'memory_trap': {
      room.phase = 'collecting';
      room.banner = `Round ${room.currentRound}/${room.rounds}: create memories first, then detect the fake.`;
      room.gameState = {
        prompts: sample(MEMORY_PROMPTS, 2),
        currentPromptIndex: 0,
        answersByPlayer: {},
        trapCards: [],
        alteredCardId: '',
        votes: {},
        scored: false
      };
      break;
    }
    default:
      break;
  }
}

function startMatch(room) {
  if (room.players.length < 3) throw new Error('At least 3 players are required to start.');
  room.status = 'playing';
  room.currentRound = 1;
  room.banner = `Starting ${MODE_META[room.mode].name}.`;
  resetScores(room);
  initRound(room);
}

function returnToLobby(room) {
  room.status = 'lobby';
  room.currentRound = 0;
  room.phase = 'lobby';
  room.banner = 'Returned to lobby.';
  room.gameState = {};
  resetScores(room);
}

function nextRoundOrFinish(room) {
  if (room.currentRound >= room.rounds) {
    room.status = 'finished';
    room.phase = 'game_over';
    room.banner = buildWinnerBanner(room);
    room.gameState = { results: true };
    return;
  }

  room.currentRound += 1;
  initRound(room);
}

function scoreCurrentRound(room) {
  if (room.gameState.scored) return;
  const gs = room.gameState;

  switch (room.mode) {
    case 'last_message': {
      const oddEntry = gs.entries.find((entry) => entry.playerId === gs.oddPlayerId);
      room.players.forEach((player) => {
        if (gs.votes[player.id] === oddEntry?.entryId) addScore(room, player.id, 2);
      });
      const correctVotes = Object.values(gs.votes).filter((vote) => vote === oddEntry?.entryId).length;
      if (correctVotes < room.players.length / 2) addScore(room, gs.oddPlayerId, 3);
      gs.correctEntryId = oddEntry?.entryId;
      break;
    }
    case 'rule_breaker': {
      room.players.forEach((player) => {
        if (gs.votes[player.id] === gs.outsiderId) addScore(room, player.id, 2);
      });
      const votesAgainst = Object.values(gs.votes).filter((vote) => vote === gs.outsiderId).length;
      if (votesAgainst < room.players.length / 2) addScore(room, gs.outsiderId, 3);
      if (gs.outsiderGuessCorrect) addScore(room, gs.outsiderId, 2);
      break;
    }
    case 'fake_internet': {
      const realEntry = gs.entries.find((entry) => entry.isReal);
      room.players.forEach((player) => {
        if (gs.votes[player.id] === realEntry?.entryId) addScore(room, player.id, 2);
      });
      Object.values(gs.votes).forEach((entryId) => {
        const entry = gs.entries.find((item) => item.entryId === entryId);
        if (entry && !entry.isReal) addScore(room, entry.playerId, 1);
      });
      break;
    }
    case 'chain_reaction': {
      Object.values(gs.votes).forEach((entryId) => {
        const item = gs.history.find((historyItem) => historyItem.entryId === entryId);
        if (item) addScore(room, item.playerId, 2);
      });
      break;
    }
    case 'secret_objective': {
      Object.entries(gs.completionClaims).forEach(([playerId, completed]) => {
        if (completed) addScore(room, playerId, 2);
      });
      Object.entries(gs.guesses).forEach(([playerId, guess]) => {
        if (guess && gs.assignment[guess.targetId] === guess.objective) addScore(room, playerId, 2);
      });
      break;
    }
    case 'speed_lies': {
      room.players.forEach((player) => {
        if (gs.votes[player.id]) {
          const targetRole = gs.assignment[gs.votes[player.id]];
          if (targetRole === 'lie') addScore(room, player.id, 2);
        }
      });
      room.players.forEach((player) => {
        const votesAgainst = Object.values(gs.votes).filter((vote) => vote === player.id).length;
        if (gs.assignment[player.id] === 'lie' && votesAgainst <= Math.floor((room.players.length - 1) / 2)) addScore(room, player.id, 2);
        if (gs.assignment[player.id] === 'truth' && votesAgainst > 0) addScore(room, player.id, 1);
      });
      break;
    }
    case 'voice_swap': {
      Object.entries(gs.guesses).forEach(([playerId, guess]) => {
        const entry = gs.entries.find((item) => item.entryId === guess.entryId);
        if (entry && guess.playerId === entry.playerId) addScore(room, playerId, 2);
        if (entry && guess.playerId !== entry.playerId) addScore(room, entry.playerId, 1);
      });
      break;
    }
    case 'one_word_story_war': {
      Object.values(gs.votes).forEach((playerId) => addScore(room, playerId, 2));
      break;
    }
    case 'suspicious_one': {
      const suspiciousEntry = gs.entries.find((entry) => entry.playerId === gs.suspiciousId);
      room.players.forEach((player) => {
        if (gs.votes[player.id] === suspiciousEntry?.entryId) addScore(room, player.id, 2);
      });
      const votesAgainst = Object.values(gs.votes).filter((vote) => vote === suspiciousEntry?.entryId).length;
      if (votesAgainst < room.players.length / 2) addScore(room, gs.suspiciousId, 3);
      gs.correctEntryId = suspiciousEntry?.entryId;
      break;
    }
    case 'memory_trap': {
      room.players.forEach((player) => {
        if (gs.votes[player.id] === gs.alteredCardId) addScore(room, player.id, 2);
      });
      break;
    }
    default:
      break;
  }

  gs.scored = true;
}

function advancePhase(room) {
  const gs = room.gameState;

  switch (room.mode) {
    case 'last_message':
      if (room.phase === 'writing') {
        ensureEntriesFromSubmissions(room, 'submissions');
        room.phase = 'voting';
        room.banner = 'Vote for the message that came from the odd player.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Results revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'rule_breaker':
      if (room.phase === 'prompting') {
        if (gs.currentPromptIndex < gs.pack.prompts.length - 1) {
          gs.currentPromptIndex += 1;
          room.banner = `Prompt ${gs.currentPromptIndex + 1}/${gs.pack.prompts.length}: keep following the rule.`;
        } else {
          room.phase = 'outsider_guess';
          room.banner = 'Outsider: choose the hidden rule. Everyone else waits.';
        }
      } else if (room.phase === 'outsider_guess') {
        room.phase = 'voting';
        room.banner = 'Vote for the outsider.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Outsider and hidden rule revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'fake_internet':
      if (room.phase === 'writing') {
        const fakes = room.players.map((player, index) => ({
          entryId: `f${index + 1}`,
          playerId: player.id,
          text: gs.fakePosts[player.id] || '(no fake submitted)',
          isReal: false
        }));
        gs.entries = shuffle([...fakes, { entryId: 'real1', playerId: 'system', text: gs.item.real, isReal: true }]);
        room.phase = 'voting';
        room.banner = 'Vote for the one you think is real.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'The real post is revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'chain_reaction':
      if (room.phase === 'editing') {
        room.phase = 'voting';
        room.banner = 'Vote for the funniest change.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Round results.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'secret_objective':
      if (room.phase === 'interaction') {
        room.phase = 'guessing';
        room.banner = 'Submit one objective guess and claim whether you completed yours.';
      } else if (room.phase === 'guessing') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Objectives and guesses revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'speed_lies':
      if (room.phase === 'answering') {
        room.phase = 'voting';
        room.banner = 'Vote for one player you think was assigned to lie.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Truth and lies revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'voice_swap':
      if (room.phase === 'recording') {
        gs.entries = shuffle(room.players.map((player, index) => ({
          entryId: `a${index + 1}`,
          playerId: player.id,
          clip: gs.recordings[player.id] || null
        })));
        room.phase = 'guessing';
        room.banner = 'Listen to the clips and guess one identity.';
      } else if (room.phase === 'guessing') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Voice identities revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'one_word_story_war':
      if (room.phase === 'editing') {
        room.phase = 'voting';
        room.banner = 'Vote for the best contributor.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Story roles and votes revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'suspicious_one':
      if (room.phase === 'writing') {
        ensureEntriesFromSubmissions(room, 'submissions');
        room.phase = 'voting';
        room.banner = 'Vote for the suspicious answer.';
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'Suspicious player revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    case 'memory_trap':
      if (room.phase === 'collecting') {
        if (gs.currentPromptIndex < gs.prompts.length - 1) {
          gs.currentPromptIndex += 1;
          room.banner = `Memory prompt ${gs.currentPromptIndex + 1}/${gs.prompts.length}.`;
        } else {
          const cards = room.players.map((player, index) => ({
            cardId: `m${index + 1}`,
            playerId: player.id,
            text: (gs.answersByPlayer[player.id] || []).join(' | ') || '(no memory)',
            altered: false
          }));
          const chosen = randomChoice(cards);
          if (chosen) {
            chosen.text = alterAnswer(chosen.text);
            chosen.altered = true;
            gs.alteredCardId = chosen.cardId;
          }
          gs.trapCards = shuffle(cards);
          room.phase = 'voting';
          room.banner = 'One memory card was altered. Find it.';
        }
      } else if (room.phase === 'voting') {
        scoreCurrentRound(room);
        room.phase = 'reveal';
        room.banner = 'The fake memory is revealed.';
      } else if (room.phase === 'reveal') {
        nextRoundOrFinish(room);
      }
      break;
    default:
      break;
  }
}

function handlePlayerAction(room, playerId, payload) {
  const gs = room.gameState;
  const type = payload?.type;

  switch (room.mode) {
    case 'last_message':
      if (room.phase === 'writing' && type === 'submitText') gs.submissions[playerId] = safeText(payload.value, 180);
      if (room.phase === 'voting' && type === 'vote') gs.votes[playerId] = payload.entryId;
      break;
    case 'rule_breaker':
      if (room.phase === 'prompting' && type === 'submitText') {
        const key = `p${gs.currentPromptIndex}`;
        gs.answersByPrompt[key] ||= {};
        gs.answersByPrompt[key][playerId] = safeText(payload.value, 160);
      }
      if (room.phase === 'outsider_guess' && type === 'guessRule' && gs.outsiderId === playerId) {
        gs.outsiderGuess = safeText(payload.value, 120);
        gs.outsiderGuessCorrect = gs.outsiderGuess === gs.pack.rule;
      }
      if (room.phase === 'voting' && type === 'votePlayer') {
        ensureDifferentPlayer(playerId, payload.playerId);
        gs.votes[playerId] = payload.playerId;
      }
      break;
    case 'fake_internet':
      if (room.phase === 'writing' && type === 'submitText') gs.fakePosts[playerId] = safeText(payload.value, 180);
      if (room.phase === 'voting' && type === 'vote') gs.votes[playerId] = payload.entryId;
      break;
    case 'chain_reaction':
      if (room.phase === 'editing' && type === 'submitSentence') {
        const currentTurnPlayer = gs.turnOrder[gs.turnIndex];
        const nextSentence = safeText(payload.value, 220);
        if (currentTurnPlayer !== playerId) throw new Error('It is not your turn.');
        if (!diffOneWord(gs.currentSentence, nextSentence)) throw new Error('You must change exactly one word and keep the same number of words.');

        const beforeWords = gs.currentSentence.trim().split(/\s+/);
        const afterWords = nextSentence.trim().split(/\s+/);
        let changedWord = '';
        for (let i = 0; i < beforeWords.length; i += 1) {
          if (beforeWords[i] !== afterWords[i]) changedWord = `${beforeWords[i]} -> ${afterWords[i]}`;
        }

        const entryId = `c${gs.history.length + 1}`;
        gs.history.push({ entryId, playerId, before: gs.currentSentence, after: nextSentence, changedWord });
        gs.currentSentence = nextSentence;
        gs.turnIndex += 1;
        if (gs.turnIndex >= gs.turnOrder.length) {
          room.phase = 'voting';
          room.banner = 'Everyone has made one change. Vote for the best one.';
        }
      }
      if (room.phase === 'voting' && type === 'vote') gs.votes[playerId] = payload.entryId;
      break;
    case 'secret_objective':
      if (room.phase === 'interaction' && type === 'chat') {
        const text = safeText(payload.value, 160);
        if (text) gs.chat.push({ playerId, text, ts: Date.now() });
      }
      if (room.phase === 'guessing' && type === 'submitSecretGuess') {
        ensureDifferentPlayer(playerId, payload.targetId, 'Choose another player for your guess.');
        gs.guesses[playerId] = { targetId: payload.targetId, objective: payload.objective };
        gs.completionClaims[playerId] = Boolean(payload.completed);
      }
      break;
    case 'speed_lies':
      if (room.phase === 'answering' && type === 'submitText') gs.answers[playerId] = safeText(payload.value, 160);
      if (room.phase === 'voting' && type === 'votePlayer') {
        ensureDifferentPlayer(playerId, payload.playerId);
        gs.votes[playerId] = payload.playerId;
      }
      break;
    case 'voice_swap':
      if (room.phase === 'recording' && type === 'submitAudio') gs.recordings[playerId] = payload.clip || null;
      if (room.phase === 'guessing' && type === 'submitVoiceGuess') gs.guesses[playerId] = { entryId: payload.entryId, playerId: payload.playerId };
      break;
    case 'one_word_story_war':
      if (room.phase === 'editing' && type === 'submitWord') {
        const currentTurnPlayer = gs.turnOrder[gs.turnIndex];
        if (currentTurnPlayer !== playerId) throw new Error('It is not your turn.');
        const word = safeText(payload.value, 24).split(' ')[0];
        if (!word) throw new Error('Please submit one word.');
        gs.storyWords.push(word);
        gs.additions.push({ playerId, word });
        gs.turnIndex += 1;
        if (gs.turnIndex >= gs.turnOrder.length) {
          room.phase = 'voting';
          room.banner = 'Story complete. Vote for the best contributor.';
        }
      }
      if (room.phase === 'voting' && type === 'votePlayer') {
        ensureDifferentPlayer(playerId, payload.playerId);
        gs.votes[playerId] = payload.playerId;
      }
      break;
    case 'suspicious_one':
      if (room.phase === 'writing' && type === 'submitText') gs.submissions[playerId] = safeText(payload.value, 180);
      if (room.phase === 'voting' && type === 'vote') gs.votes[playerId] = payload.entryId;
      break;
    case 'memory_trap':
      if (room.phase === 'collecting' && type === 'submitText') {
        gs.answersByPlayer[playerId] ||= [];
        gs.answersByPlayer[playerId][gs.currentPromptIndex] = safeText(payload.value, 80);
      }
      if (room.phase === 'voting' && type === 'vote') gs.votes[playerId] = payload.cardId;
      break;
    default:
      break;
  }
}

function buildView(room, viewerId) {
  const gs = room.gameState || {};
  const me = getPlayer(room, viewerId);
  const base = {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    phase: room.phase,
    banner: room.banner,
    currentRound: room.currentRound,
    rounds: room.rounds,
    mode: room.mode,
    modeMeta: MODE_META,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      isHost: player.id === room.hostId
    })),
    selfId: viewerId,
    selfName: me?.name || '',
    summary: MODE_META[room.mode],
    actionState: buildActionState(room, viewerId),
    privateInfo: null,
    game: {}
  };

  if (room.status === 'lobby' || room.phase === 'game_over') return base;

  switch (room.mode) {
    case 'last_message':
      base.privateInfo = {
        role: gs.oddPlayerId === viewerId ? 'Odd player' : 'Normal player',
        prompt: gs.oddPlayerId === viewerId ? gs.pair.odd : gs.pair.normal
      };
      base.game = {
        entries: (gs.entries || []).map((entry) => ({ entryId: entry.entryId, text: entry.text })),
        submissionsCount: Object.keys(gs.submissions || {}).length,
        reveal: room.phase === 'reveal'
          ? {
              oddPlayerId: gs.oddPlayerId,
              oddPrompt: gs.pair.odd,
              normalPrompt: gs.pair.normal,
              entries: gs.entries.map((entry) => ({ ...entry, playerName: getPlayer(room, entry.playerId)?.name || 'Unknown' }))
            }
          : null
      };
      break;
    case 'rule_breaker':
      base.privateInfo = gs.outsiderId === viewerId
        ? { role: 'Outsider', hint: 'You do not know the hidden rule. Blend in and guess later.' }
        : { role: 'Rule follower', rule: gs.pack.rule };
      base.game = {
        prompt: gs.pack.prompts?.[gs.currentPromptIndex],
        promptIndex: gs.currentPromptIndex,
        promptTotal: gs.pack.prompts?.length,
        answersByPrompt: Object.entries(gs.answersByPrompt || {}).map(([, value], index) => ({
          label: gs.pack.prompts[index],
          answers: room.players.map((player) => ({
            playerId: player.id,
            playerName: player.name,
            text: value[player.id] || '-'
          }))
        })),
        options: gs.outsiderId === viewerId ? gs.options : [],
        outsiderId: room.phase === 'reveal' ? gs.outsiderId : null,
        outsiderGuess: room.phase === 'reveal' ? gs.outsiderGuess : null,
        outsiderGuessCorrect: room.phase === 'reveal' ? gs.outsiderGuessCorrect : null,
        rule: room.phase === 'reveal' ? gs.pack.rule : null
      };
      break;
    case 'fake_internet':
      base.privateInfo = { category: gs.item.category };
      base.game = {
        category: gs.item.category,
        entries: (gs.entries || []).map((entry) => ({ entryId: entry.entryId, text: entry.text })),
        submissionsCount: Object.keys(gs.fakePosts || {}).length,
        reveal: room.phase === 'reveal'
          ? gs.entries.map((entry) => ({
              ...entry,
              playerName: entry.playerId === 'system' ? 'Real post' : getPlayer(room, entry.playerId)?.name || 'Unknown'
            }))
          : null
      };
      break;
    case 'chain_reaction':
      base.privateInfo = {
        turn: gs.turnOrder?.[gs.turnIndex] === viewerId
          ? 'Your move'
          : `Waiting for ${getPlayer(room, gs.turnOrder?.[gs.turnIndex])?.name || 'player'}`
      };
      base.game = {
        baseSentence: gs.baseSentence,
        currentSentence: gs.currentSentence,
        turnPlayerId: gs.turnOrder?.[gs.turnIndex],
        history: (gs.history || []).map((item) => ({ ...item, playerName: getPlayer(room, item.playerId)?.name || 'Unknown' }))
      };
      break;
    case 'secret_objective':
      base.privateInfo = { objective: gs.assignment?.[viewerId] };
      base.game = {
        prompt: gs.prompt,
        objectives: Object.values(gs.assignment || {}),
        chat: (gs.chat || []).map((message) => ({
          playerName: getPlayer(room, message.playerId)?.name || 'Unknown',
          text: message.text
        })),
        assignments: room.phase === 'reveal'
          ? Object.entries(gs.assignment || {}).map(([playerId, objective]) => ({
              playerId,
              playerName: getPlayer(room, playerId)?.name || 'Unknown',
              objective
            }))
          : [],
        completionClaims: room.phase === 'reveal' ? gs.completionClaims : {}
      };
      break;
    case 'speed_lies':
      base.privateInfo = { assignment: gs.assignment?.[viewerId] };
      base.game = {
        prompt: gs.prompt,
        answers: room.players.map((player) => ({
          playerId: player.id,
          playerName: player.name,
          text: gs.answers?.[player.id] || '-',
          role: room.phase === 'reveal' ? gs.assignment[player.id] : null
        }))
      };
      break;
    case 'voice_swap':
      base.privateInfo = { prompt: gs.prompt };
      base.game = {
        prompt: gs.prompt,
        recordingsCount: Object.keys(gs.recordings || {}).length,
        entries: (gs.entries || []).map((entry) => ({
          entryId: entry.entryId,
          clip: entry.clip,
          playerName: room.phase === 'reveal' ? getPlayer(room, entry.playerId)?.name || 'Unknown' : null
        }))
      };
      break;
    case 'one_word_story_war':
      base.privateInfo = { role: gs.roles?.[viewerId] };
      base.game = {
        start: gs.start,
        story: `${gs.start} ${gs.storyWords.join(' ')}`.trim(),
        turnPlayerId: gs.turnOrder?.[gs.turnIndex],
        additions: (gs.additions || []).map((item) => ({ ...item, playerName: getPlayer(room, item.playerId)?.name || 'Unknown' })),
        roles: room.phase === 'reveal'
          ? Object.entries(gs.roles || {}).map(([playerId, role]) => ({
              playerId,
              playerName: getPlayer(room, playerId)?.name || 'Unknown',
              role
            }))
          : []
      };
      break;
    case 'suspicious_one':
      base.privateInfo = {
        role: gs.suspiciousId === viewerId ? 'Suspicious player' : 'Normal player',
        prompt: gs.suspiciousId === viewerId ? gs.pack.suspicious : gs.pack.base
      };
      base.game = {
        entries: (gs.entries || []).map((entry) => ({ entryId: entry.entryId, text: entry.text })),
        submissionsCount: Object.keys(gs.submissions || {}).length,
        reveal: room.phase === 'reveal'
          ? {
              suspiciousId: gs.suspiciousId,
              base: gs.pack.base,
              suspicious: gs.pack.suspicious,
              entries: gs.entries.map((entry) => ({ ...entry, playerName: getPlayer(room, entry.playerId)?.name || 'Unknown' }))
            }
          : null
      };
      break;
    case 'memory_trap':
      base.privateInfo = { prompt: gs.prompts?.[gs.currentPromptIndex] };
      base.game = {
        prompts: gs.prompts,
        currentPromptIndex: gs.currentPromptIndex,
        answersCount: Object.keys(gs.answersByPlayer || {}).length,
        trapCards: gs.trapCards || [],
        alteredCardId: room.phase === 'reveal' ? gs.alteredCardId : null
      };
      break;
    default:
      break;
  }

  return base;
}

async function createRoom(store, name) {
  const roomCode = await makeCode(store);
  const playerId = makeId('player');
  const playerName = safeText(name, 20) || 'Player';
  const room = {
    code: roomCode,
    hostId: playerId,
    mode: 'last_message',
    rounds: 3,
    currentRound: 0,
    status: 'lobby',
    phase: 'lobby',
    banner: 'Waiting in lobby.',
    players: [{ id: playerId, name: playerName, score: 0 }],
    gameState: {}
  };

  await store.saveRoom(room);
  return { roomCode, playerId };
}

async function getRoomOrThrow(store, roomCode) {
  const room = await store.getRoom(roomCode);
  if (!room) throw new Error('Room not found.');
  return room;
}

async function joinRoom(store, name, code) {
  const room = await getRoomOrThrow(store, code);
  const playerName = safeText(name, 20) || 'Player';
  if (room.players.length >= 10) throw new Error('Room is full (max 10 players).');
  if (room.status !== 'lobby') throw new Error('Game already in progress.');
  if (hasPlayerName(room, playerName)) throw new Error('That display name is already in use in this room.');

  const playerId = makeId('player');
  room.players.push({ id: playerId, name: playerName, score: 0 });
  room.banner = `${playerName} joined the room.`;
  await store.saveRoom(room);
  return { roomCode: room.code, playerId };
}

async function leaveRoom(store, roomCode, playerId) {
  const room = await store.getRoom(roomCode);
  if (!room) return;

  const leaving = getPlayer(room, playerId);
  room.players = room.players.filter((player) => player.id !== playerId);

  if (!room.players.length) {
    await store.deleteRoom(room.code);
    return;
  }

  if (room.hostId === playerId) room.hostId = room.players[0].id;
  room.banner = `${leaving?.name || 'A player'} left the room.`;

  if (room.status === 'playing') {
    room.status = 'lobby';
    room.phase = 'lobby';
    room.gameState = {};
    room.currentRound = 0;
    room.banner = room.players.length < 3
      ? 'Returned to lobby because fewer than 3 players remain.'
      : 'Returned to lobby because a player left during the match.';
    resetScores(room);
  }

  await store.saveRoom(room);
}

export function createGameApi(store) {
  return {
    async handle({ method, pathname, searchParams, body }) {
      try {
        if (pathname === '/api/modes' && method === 'GET') {
          return { status: 200, data: { modes: MODE_META } };
        }

        if (pathname === '/api/create-room' && method === 'POST') {
          return { status: 200, data: await createRoom(store, body.name) };
        }

        if (pathname === '/api/join-room' && method === 'POST') {
          return { status: 200, data: await joinRoom(store, body.name, body.code) };
        }

        if (pathname === '/api/state' && method === 'GET') {
          const room = await store.getRoom(searchParams.get('roomCode'));
          if (!room) return { status: 404, data: { error: 'Room not found.' } };

          const playerId = searchParams.get('playerId');
          if (!getPlayer(room, playerId)) return { status: 403, data: { error: 'Player not in room.' } };

          return { status: 200, data: buildView(room, playerId) };
        }

        const room = await store.getRoom(body.roomCode);
        if (!room) return { status: 404, data: { error: 'Room not found.' } };

        const playerId = body.playerId;
        if (!getPlayer(room, playerId)) return { status: 403, data: { error: 'Player not in room.' } };

        if (pathname === '/api/save-settings' && method === 'POST') {
          ensureHost(room, playerId);
          if (room.status !== 'lobby') throw new Error('Settings can only be changed in the lobby.');
          if (!MODE_META[body.mode]) throw new Error('Invalid mode.');
          room.mode = body.mode;
          room.rounds = Math.max(1, Math.min(10, Number(body.rounds) || 3));
          room.banner = `${MODE_META[body.mode].name} selected.`;
          await store.saveRoom(room);
          return { status: 200, data: { ok: true } };
        }

        if (pathname === '/api/start-game' && method === 'POST') {
          ensureHost(room, playerId);
          startMatch(room);
          await store.saveRoom(room);
          return { status: 200, data: { ok: true } };
        }

        if (pathname === '/api/advance-phase' && method === 'POST') {
          ensureHost(room, playerId);
          if (room.status === 'lobby') throw new Error('Start the game first.');
          advancePhase(room);
          await store.saveRoom(room);
          return { status: 200, data: { ok: true } };
        }

        if (pathname === '/api/return-to-lobby' && method === 'POST') {
          ensureHost(room, playerId);
          returnToLobby(room);
          await store.saveRoom(room);
          return { status: 200, data: { ok: true } };
        }

        if (pathname === '/api/player-action' && method === 'POST') {
          if (room.status !== 'playing') throw new Error('A match is not running.');
          handlePlayerAction(room, playerId, body.payload || {});
          await store.saveRoom(room);
          return { status: 200, data: { ok: true } };
        }

        if (pathname === '/api/leave-room' && method === 'POST') {
          await leaveRoom(store, body.roomCode, playerId);
          return { status: 200, data: { ok: true } };
        }

        return { status: 404, data: { error: 'Not found' } };
      } catch (error) {
        return { status: 400, data: { error: error.message || 'Request failed.' } };
      }
    }
  };
}
