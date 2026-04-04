let modesMeta = {};
let roomState = null;
let session = JSON.parse(localStorage.getItem("partyFusionSession") || "null");
let voiceDraft = null;
let mediaRecorder = null;
let recordChunks = [];
let pollHandle = null;
let pendingLobbySettings = null;
let savingLobbySettings = false;
let noticeHandle = null;
let lastNoticeKey = "";
let lastNoticeAt = 0;
let lastSyncError = "";
let lastRenderedStateKey = "";

const $ = (id) => document.getElementById(id);

function apiUrl(path = "") {
  const normalized = String(path || "");
  return normalized.startsWith("/api") ? normalized : `/api${normalized}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toTitle(text) {
  return String(text)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function playerName(id) {
  return (
    roomState?.players?.find((player) => player.id === id)?.name || "Unknown"
  );
}

function actionState() {
  return roomState?.actionState || {};
}

function disabledAttr(value) {
  return value ? "disabled" : "";
}

function renderInlineNote(show, text) {
  return show ? `<p class="inline-note">${escapeHtml(text)}</p>` : "";
}

function renderEditableSubmissionNote(show, label = "Saved") {
  return renderInlineNote(
    show,
    `${label}. Submit again to replace it before the phase changes.`,
  );
}

function isHost() {
  return roomState && roomState.hostId === roomState.selfId;
}

function getAdvanceButtonLabel() {
  if (!roomState) return "Advance phase";
  if (roomState.phase === "reveal") return "Next round";

  const labels = {
    writing: "Open voting",
    prompting: "Next prompt",
    outsider_guess: "Open voting",
    interaction: "Open guesses",
    answering: "Open voting",
    recording: "Open guessing",
    guessing: "Reveal results",
    voting: "Reveal results",
    editing: "Open voting",
    collecting: "Next prompt",
  };

  return labels[roomState.phase] || "Advance phase";
}

function getDynamicInputDefaults() {
  return {
    chatInput: "",
    sentenceInput: roomState?.game?.currentSentence || "",
    wordInput: "",
    voiceFallbackInput: "",
    mainText: "",
  };
}

function captureDynamicInputState() {
  const values = {};
  const activeElement = document.activeElement;
  const focusedId =
    activeElement && activeElement.id && $(activeElement.id) === activeElement
      ? activeElement.id
      : "";
  const selection =
    focusedId &&
    typeof activeElement.selectionStart === "number" &&
    typeof activeElement.selectionEnd === "number"
      ? {
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd,
        }
      : null;

  Object.keys(getDynamicInputDefaults()).forEach((id) => {
    const el = $(id);
    if (el) values[id] = el.value;
  });

  return { values, focusedId, selection };
}

function restoreDynamicInputState(inputState = {}) {
  const defaults = getDynamicInputDefaults();
  const values = inputState.values || {};

  Object.entries(defaults).forEach(([id, fallback]) => {
    const el = $(id);
    if (!el) return;
    el.value = values[id] ?? fallback;
  });

  if (inputState.focusedId) {
    const el = $(inputState.focusedId);
    if (el && !el.disabled) {
      el.focus();
      if (
        inputState.selection &&
        typeof el.setSelectionRange === "function" &&
        typeof inputState.selection.start === "number" &&
        typeof inputState.selection.end === "number"
      ) {
        el.setSelectionRange(
          inputState.selection.start,
          inputState.selection.end,
        );
      }
    }
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function renderRoomSummary() {
  if (!roomState) return "";

  return [
    `<div class="summary-chip"><span>Mode</span><strong>${escapeHtml(
      modesMeta[roomState.mode]?.name || roomState.mode,
    )}</strong></div>`,
    `<div class="summary-chip"><span>Round</span><strong>${roomState.currentRound ? `${roomState.currentRound}/${roomState.rounds}` : `Lobby · ${roomState.rounds}`}</strong></div>`,
    `<div class="summary-chip"><span>Players</span><strong>${roomState.players.length}</strong></div>`,
    `<div class="summary-chip"><span>You</span><strong>${escapeHtml(roomState.selfName || "Player")}</strong></div>`,
  ].join("");
}

function renderPhaseMeta() {
  if (!roomState) return "";

  const parts = [
    `<div class="meta-pill"><span>Phase</span><strong>${escapeHtml(
      toTitle(roomState.phase),
    )}</strong></div>`,
  ];

  if (roomState.privateInfo?.role) {
    parts.push(
      `<div class="meta-pill"><span>Role</span><strong>${escapeHtml(
        roomState.privateInfo.role,
      )}</strong></div>`,
    );
  }

  if (roomState.privateInfo?.assignment) {
    parts.push(
      `<div class="meta-pill"><span>Assignment</span><strong>${escapeHtml(
        roomState.privateInfo.assignment,
      )}</strong></div>`,
    );
  }

  return parts.join("");
}

function renderConnection(text) {
  const badge = $("connectionBadge");
  badge.textContent = text;
  badge.dataset.state = /connected/i.test(text)
    ? "connected"
    : /disconnected/i.test(text)
      ? "disconnected"
      : "pending";
}

function showNotice(message, tone = "info") {
  const nextKey = `${tone}:${message}`;
  const now = Date.now();
  if (nextKey === lastNoticeKey && now - lastNoticeAt < 1800) return;

  lastNoticeKey = nextKey;
  lastNoticeAt = now;
  const notice = $("notice");
  notice.textContent = message;
  notice.dataset.tone = tone;
  notice.classList.remove("hidden");
  clearTimeout(noticeHandle);
  noticeHandle = setTimeout(() => {
    notice.classList.add("hidden");
  }, 3400);
}

function handleError(err) {
  const message = err?.message || "Something went wrong.";
  showNotice(message, "error");
}

async function api(path, body, method = "POST") {
  const options = { method, headers: {} };
  if (method !== "GET") {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body || {});
  }

  const response = await fetch(apiUrl(path), options);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (/<!doctype html/i.test(text)) {
      throw new Error(
        "The Party Fusion function endpoint is unavailable. Run the app with `npm start` so Netlify Functions are available.",
      );
    }
    throw new Error("Unexpected server response.");
  }

  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(data.error || "Request failed.");
  return data;
}

async function fetchModes() {
  const data = await api("/api/modes", null, "GET");
  modesMeta = data.modes;
  populateModes();
}

function populateModes() {
  const select = $("modeSelect");
  if (!select) return;

  select.innerHTML = Object.entries(modesMeta)
    .map(
      ([key, meta]) =>
        `<option value="${key}">${escapeHtml(meta.name)}</option>`,
    )
    .join("");
}

function saveSession(nextSession) {
  session = nextSession;
  if (session)
    localStorage.setItem("partyFusionSession", JSON.stringify(session));
  else localStorage.removeItem("partyFusionSession");
}

async function createRoom(name) {
  if (!name) throw new Error("Enter a display name first.");
  const result = await api("/api/create-room", { name });
  saveSession(result);
  startPolling();
}

async function joinRoom(name, code) {
  if (!name) throw new Error("Enter a display name first.");
  if (!code) throw new Error("Enter a room code first.");
  const result = await api("/api/join-room", { name, code });
  saveSession(result);
  startPolling();
}

async function refreshState() {
  if (!session) {
    roomState = null;
    render();
    return;
  }

  try {
    renderConnection("Syncing...");
    const nextRoomState = await api(
      `/api/state?roomCode=${encodeURIComponent(session.roomCode)}&playerId=${encodeURIComponent(session.playerId)}`,
      null,
      "GET",
    );
    renderConnection("Connected");
    lastSyncError = "";
    const nextStateKey = stableStringify(nextRoomState);
    roomState = nextRoomState;
    if (nextStateKey !== lastRenderedStateKey) {
      lastRenderedStateKey = nextStateKey;
      render();
    }
  } catch (err) {
    renderConnection("Disconnected");
    if (err.message !== lastSyncError) {
      lastSyncError = err.message;
      showNotice(err.message, "error");
    }
    if (/Room not found|Player not in room/i.test(err.message)) {
      saveSession(null);
      roomState = null;
      render();
    }
  }
}

function startPolling() {
  if (pollHandle) clearInterval(pollHandle);
  refreshState();
  pollHandle = setInterval(refreshState, 2000);
}

async function postWithSession(path, extra = {}) {
  if (!session) throw new Error("Not connected to a room.");
  await api(path, {
    roomCode: session.roomCode,
    playerId: session.playerId,
    ...extra,
  });
  await refreshState();
}

async function saveLobbySettings() {
  if (
    !session ||
    !roomState ||
    !isHost() ||
    roomState.status !== "lobby" ||
    savingLobbySettings
  )
    return;

  const nextMode = $("modeSelect").value;
  const nextRounds = $("roundsInput").value;
  pendingLobbySettings = { mode: nextMode, rounds: String(nextRounds) };
  savingLobbySettings = true;

  try {
    await postWithSession("/api/save-settings", {
      mode: nextMode,
      rounds: nextRounds,
    });
    pendingLobbySettings = null;
    return true;
  } finally {
    savingLobbySettings = false;
  }
}

$("createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createRoom($("createName").value.trim());
    showNotice(
      "Room created. Share the code and start when everyone is ready.",
      "success",
    );
  } catch (err) {
    handleError(err);
  }
});

$("joinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await joinRoom(
      $("joinName").value.trim(),
      $("joinCode").value.trim().toUpperCase(),
    );
    showNotice("Joined room successfully.", "success");
  } catch (err) {
    handleError(err);
  }
});

$("saveSettingsBtn").addEventListener("click", async () => {
  try {
    if (await saveLobbySettings()) {
      showNotice("Lobby settings saved.", "success");
    }
  } catch (err) {
    handleError(err);
  }
});

$("modeSelect").addEventListener("change", async () => {
  try {
    if (await saveLobbySettings()) {
      showNotice("Game mode updated.", "success");
    }
  } catch (err) {
    handleError(err);
  }
});

$("roundsInput").addEventListener("change", async () => {
  try {
    if (await saveLobbySettings()) {
      showNotice("Round count updated.", "success");
    }
  } catch (err) {
    handleError(err);
  }
});

$("startBtn").addEventListener("click", async () => {
  try {
    await postWithSession("/api/start-game");
    showNotice("Match started.", "success");
  } catch (err) {
    handleError(err);
  }
});

$("advanceBtn").addEventListener("click", async () => {
  try {
    await postWithSession("/api/advance-phase");
    showNotice("Phase advanced.", "success");
  } catch (err) {
    handleError(err);
  }
});

$("restartBtn").addEventListener("click", async () => {
  try {
    await postWithSession("/api/return-to-lobby");
    showNotice("Returned to lobby.", "success");
  } catch (err) {
    handleError(err);
  }
});

$("copyCodeBtn").addEventListener("click", async () => {
  if (!roomState?.code) return;

  try {
    await navigator.clipboard.writeText(roomState.code);
    showNotice(`Room code ${roomState.code} copied.`, "success");
  } catch (_) {
    showNotice(`Room code: ${roomState.code}`, "info");
  }
});

$("leaveBtn").addEventListener("click", async () => {
  try {
    if (session) await api("/api/leave-room", session);
  } catch (_) {}

  saveSession(null);
  roomState = null;
  voiceDraft = null;
  lastRenderedStateKey = "";
  if (pollHandle) clearInterval(pollHandle);
  render();
});

function render() {
  $("authSection").classList.toggle("hidden", Boolean(roomState));
  $("appSection").classList.toggle("hidden", !roomState);
  $("roomSummary").classList.toggle("hidden", !roomState);
  $("phaseMeta").classList.toggle("hidden", !roomState);
  if (!roomState) {
    lastRenderedStateKey = "";
    $("roomSummary").innerHTML = "";
    $("phaseMeta").innerHTML = "";
    return;
  }

  $("roomCode").textContent = roomState.code;
  $("statusText").textContent =
    `${toTitle(roomState.status)} | ${modesMeta[roomState.mode]?.name || roomState.mode}${roomState.currentRound ? ` | Round ${roomState.currentRound}/${roomState.rounds}` : ""}`;
  $("playerCount").textContent = `${roomState.players.length} player${roomState.players.length === 1 ? "" : "s"} in room`;
  $("playerList").innerHTML = roomState.players
    .map(
      (player) => `
    <div class="player-pill">
      <div>
        <div class="name">${escapeHtml(player.name)} ${player.id === roomState.selfId ? "- You" : ""}</div>
        <div class="meta">${player.isHost ? "Host" : "Player"}</div>
      </div>
      <div class="highlight">${player.score}</div>
    </div>
  `,
    )
    .join("");

  populateModes();
  const displayedMode = pendingLobbySettings?.mode || roomState.mode;
  const displayedRounds =
    pendingLobbySettings?.rounds || String(roomState.rounds);
  $("modeSelect").value = displayedMode;
  $("roundsInput").value = displayedRounds;
  $("modeSelect").disabled = roomState.status !== "lobby" || !isHost();
  $("roundsInput").disabled = roomState.status !== "lobby" || !isHost();
  $("saveSettingsBtn").disabled = !isHost() || roomState.status !== "lobby";
  $("startBtn").disabled = !isHost() || roomState.status !== "lobby";
  $("advanceBtn").disabled = !roomState.actionState?.canAdvance;
  $("advanceBtn").textContent = getAdvanceButtonLabel();
  $("restartBtn").disabled = !isHost();
  $("hostCard").classList.toggle("hidden", !isHost());
  $("modeSummary").innerHTML = roomState.summary
    ? `<strong>${escapeHtml(roomState.summary.name)}</strong><br>${escapeHtml(roomState.summary.summary)}`
    : "";

  $("banner").textContent = roomState.banner || "";
  $("banner").classList.toggle("hidden", !roomState.banner);
  $("roomSummary").innerHTML = renderRoomSummary();
  $("phaseMeta").innerHTML = renderPhaseMeta();

  const privateInfo = $("privateInfo");
  if (roomState.privateInfo && Object.keys(roomState.privateInfo).length) {
    privateInfo.classList.remove("hidden");
    privateInfo.innerHTML = `<h3>Your private info</h3><div class="kv-stack">${Object.entries(
      roomState.privateInfo,
    )
      .map(
        ([key, value]) =>
          `<div class="kv"><strong>${escapeHtml(toTitle(key))}</strong><div>${escapeHtml(value)}</div></div>`,
      )
      .join("")}</div>`;
  } else {
    privateInfo.classList.add("hidden");
    privateInfo.innerHTML = "";
  }

  // Preserve input values
  const inputState = captureDynamicInputState();

  $("gameArea").innerHTML = renderGameArea();
  wireDynamicControls();
  restoreDynamicInputState(inputState);
}

function renderScoreboard() {
  const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
  return `<div class="card score-card"><div class="section-kicker">Scoreboard</div><h3>Current standings</h3><div class="scoreboard">${sorted.map((player, index) => `<div class="score-row ${index === 0 ? "leader" : ""}"><div><strong>${escapeHtml(player.name)}</strong><div class="small">${player.id === roomState.selfId ? "You" : index === 0 ? "Leading" : "In play"}</div></div><div class="highlight">${player.score}</div></div>`).join("")}</div></div>`;
}

function getPhaseInstruction() {
  if (!roomState) return "";

  const instructions = {
    lobby: isHost()
      ? "Pick a mode, confirm rounds, then start when everyone has joined."
      : "Wait for the host to choose the mode and start the room.",
    writing: "Write your response clearly. The round will move on as soon as everyone submits.",
    prompting: "Answer the current prompt. The next prompt opens automatically when all players answer.",
    outsider_guess: "Only the outsider can act here. Everyone else waits for the guess.",
    interaction: "Chat naturally and work your hidden objective into the conversation.",
    answering: "Submit your answer. Voting opens automatically once everyone is done.",
    recording: "Record or type your clip. Guessing opens automatically after all clips are in.",
    editing: "Watch turn order carefully. Only the active player can edit right now.",
    guessing: "Lock one guess. The reveal opens automatically after everyone submits.",
    voting: "Vote once. Results open automatically as soon as all votes are in.",
    collecting: "Answer the current memory prompt. The next step opens when everyone submits.",
    reveal: "Review the outcome, then continue if another round remains.",
    game_over: "Return to the lobby to start a new mode.",
  };

  return instructions[roomState.phase] || "Follow the current round instructions.";
}

function renderGameRail() {
  return `<div class="card rail-card"><div class="section-kicker">Live round</div><h3>${escapeHtml(modesMeta[roomState.mode]?.name || toTitle(roomState.mode))}</h3><p class="small rail-copy">${escapeHtml(getPhaseInstruction())}</p><div class="rail-stats"><div class="rail-stat"><span>Phase</span><strong>${escapeHtml(toTitle(roomState.phase))}</strong></div><div class="rail-stat"><span>Round</span><strong>${roomState.currentRound || 0}/${roomState.rounds}</strong></div><div class="rail-stat"><span>Players</span><strong>${roomState.players.length}</strong></div></div></div>${renderScoreboard()}`;
}

function renderGameShell(content) {
  return `<div class="game-stage"><div class="game-main">${content}</div><aside class="game-side">${renderGameRail()}</aside></div>`;
}

function renderGameArea() {
  if (roomState.status === "lobby") {
    return renderGameShell(
      `<div class="card stage-card"><div class="section-kicker">Lobby setup</div><h2 class="phase-title">Choose a game mode</h2><p class="phase-subtitle">${isHost() ? "Tap a card or use the selector. Changes save automatically while the room is in the lobby." : "The host chooses the mode for the room. All modes support 3-10 players."}</p><div class="choice-grid">${Object.entries(
      modesMeta,
    )
      .map(
        ([key, meta]) =>
          `<button type="button" class="choice-card mode-card ${roomState.mode === key ? "active" : ""}" data-action="select-mode" data-mode="${key}" ${!isHost() || roomState.status !== "lobby" ? "disabled" : ""}><strong>${escapeHtml(meta.name)}</strong><p class="small">${escapeHtml(meta.summary)}</p></button>`,
      )
      .join("")}</div></div>`,
    );
  }

  if (roomState.phase === "game_over" || roomState.status === "finished") {
    return renderGameShell(
      `<div class="card stage-card"><div class="section-kicker">Match complete</div><h2 class="phase-title">Match complete</h2><p class="phase-subtitle">Use "Return to lobby" to start another mode.</p></div>`,
    );
  }

  const renderers = {
    last_message: renderLastMessage,
    rule_breaker: renderRuleBreaker,
    fake_internet: renderFakeInternet,
    chain_reaction: renderChainReaction,
    secret_objective: renderSecretObjective,
    speed_lies: renderSpeedLies,
    voice_swap: renderVoiceSwap,
    one_word_story_war: renderOneWordStoryWar,
    suspicious_one: renderSuspiciousOne,
    memory_trap: renderMemoryTrap,
  };

  return renderGameShell(
    renderers[roomState.mode]
      ? renderers[roomState.mode]()
      : '<div class="card stage-card">Unknown mode.</div>',
  );
}

function renderLastMessage() {
  const game = roomState.game;
  const alreadySubmitted = actionState().submitted;
  const alreadyVoted = actionState().voted;
  if (roomState.phase === "writing")
    return `<div class="card"><h2 class="phase-title">Last Message</h2><div class="prompt-box">Write a short final message based on your private scenario.</div><p class="small">Submitted: ${game.submissionsCount}/${roomState.players.length}</p>${renderEditableSubmissionNote(alreadySubmitted, "Message saved")}<form id="mainTextForm" class="stack"><textarea id="mainText" maxlength="180" placeholder="My last message to the group..."></textarea><button type="submit">Submit message</button></form></div>`;
  if (roomState.phase === "voting")
    return `<div class="card"><h2 class="phase-title">Vote for the odd prompt</h2><p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(alreadyVoted, "Vote locked in. Waiting for the reveal.")}<div class="entry-grid">${game.entries.map((entry) => `<div class="entry-card"><div>${escapeHtml(entry.text)}</div><div class="spacer-sm"></div><button data-action="vote-entry" data-entry="${entry.entryId}" ${disabledAttr(alreadyVoted)}>Vote for this message</button></div>`).join("")}</div></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><p class="phase-subtitle">Odd player: <span class="highlight">${escapeHtml(playerName(game.reveal.oddPlayerId))}</span></p><div class="stack"><div class="prompt-box"><strong>Normal prompt:</strong> ${escapeHtml(game.reveal.normalPrompt)}</div><div class="prompt-box"><strong>Odd prompt:</strong> ${escapeHtml(game.reveal.oddPrompt)}</div>${game.reveal.entries.map((entry) => `<div class="message-card ${entry.playerId === game.reveal.oddPlayerId ? "active" : ""}"><strong>${escapeHtml(entry.playerName)}</strong><div>${escapeHtml(entry.text)}</div></div>`).join("")}</div></div>`;
}

function renderRuleBreaker() {
  const game = roomState.game;
  const state = actionState();
  const answerBlocks = game.answersByPrompt
    .map(
      (block) =>
        `<div class="card"><strong>${escapeHtml(block.label)}</strong><div class="stack spaced-top">${block.answers.map((answer) => `<div class="message-card"><strong>${escapeHtml(answer.playerName)}:</strong> ${escapeHtml(answer.text)}</div>`).join("")}</div></div>`,
    )
    .join("");
  if (roomState.phase === "prompting")
    return `<div class="card"><h2 class="phase-title">Rule Breaker</h2><div class="prompt-box">Prompt ${game.promptIndex + 1}/${game.promptTotal}: ${escapeHtml(game.prompt)}</div>${answerBlocks || ""}${renderEditableSubmissionNote(state.submitted, "Answer saved")}<form id="mainTextForm" class="stack"><textarea id="mainText" maxlength="160" placeholder="Type your answer..."></textarea><button type="submit">Submit answer</button></form></div>`;
  if (roomState.phase === "outsider_guess")
    return `<div class="card"><h2 class="phase-title">Outsider guess</h2>${answerBlocks}${game.options.length ? `${renderInlineNote(state.guessed, "Rule guess submitted.")}<div class="choice-grid">${game.options.map((option) => `<div class="choice-card"><div>${escapeHtml(option)}</div><button data-action="guess-rule" data-value="${escapeHtml(option)}" ${disabledAttr(state.guessed)}>Choose this rule</button></div>`).join("")}</div>` : '<p class="small">Waiting for the outsider to guess the hidden rule.</p>'}</div>`;
  if (roomState.phase === "voting")
    return `<div class="card"><h2 class="phase-title">Vote for the outsider</h2><p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${answerBlocks}${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}<div class="choice-grid">${roomState.players
      .filter((player) => player.id !== roomState.selfId)
      .map(
        (player) =>
          `<div class="choice-card"><strong>${escapeHtml(player.name)}</strong><button data-action="vote-player" data-player="${player.id}" ${disabledAttr(state.voted)}>Vote ${escapeHtml(player.name)}</button></div>`,
      )
      .join("")}</div></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><p><strong>Outsider:</strong> ${escapeHtml(playerName(game.outsiderId))}</p><p><strong>Hidden rule:</strong> ${escapeHtml(game.rule)}</p><p><strong>Outsider guess:</strong> ${escapeHtml(game.outsiderGuess || "No guess")} ${game.outsiderGuessCorrect ? "Correct" : "Wrong"}</p>${answerBlocks}</div>`;
}

function renderFakeInternet() {
  const game = roomState.game;
  const state = actionState();
  if (roomState.phase === "writing")
    return `<div class="card"><h2 class="phase-title">Fake Internet</h2><div class="prompt-box">Category: ${escapeHtml(game.category)}</div><p class="small">Submitted: ${game.submissionsCount}/${roomState.players.length}</p>${renderEditableSubmissionNote(state.submitted, "Fake post saved")}<form id="mainTextForm" class="stack"><textarea id="mainText" maxlength="180" placeholder="Write something that looks convincingly real..."></textarea><button type="submit">Submit fake post</button></form></div>`;
  if (roomState.phase === "voting")
    return `<div class="card"><h2 class="phase-title">Pick the real post</h2><p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}<div class="entry-grid">${game.entries.map((entry) => `<div class="entry-card"><div>${escapeHtml(entry.text)}</div><div class="spacer-sm"></div><button data-action="vote-entry" data-entry="${entry.entryId}" ${disabledAttr(state.voted)}>Vote real</button></div>`).join("")}</div></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><div class="stack">${game.reveal.map((entry) => `<div class="message-card ${entry.isReal ? "active" : ""}"><strong>${escapeHtml(entry.playerName)}</strong> ${entry.isReal ? '<span class="vote-badge">REAL</span>' : ""}<div>${escapeHtml(entry.text)}</div></div>`).join("")}</div></div>`;
}

function renderChainReaction() {
  const game = roomState.game;
  const state = actionState();
  const history = game.history
    .map(
      (item) =>
        `<div class="history-card"><strong>${escapeHtml(item.playerName)}</strong><div class="small">Changed: ${escapeHtml(item.changedWord)}</div><div>${escapeHtml(item.before)}</div><div class="highlight">-> ${escapeHtml(item.after)}</div>${roomState.phase === "voting" ? `<button data-action="vote-entry" data-entry="${item.entryId}" ${disabledAttr(state.voted)}>Vote this change</button>` : ""}</div>`,
    )
    .join("");
  if (roomState.phase === "editing") {
    const yourTurn = game.turnPlayerId === roomState.selfId;
    return `<div class="card"><h2 class="phase-title">Chain Reaction</h2><div class="prompt-box"><strong>Current sentence:</strong> ${escapeHtml(game.currentSentence)}</div><p class="small">Change exactly one word. Same number of words only.</p>${yourTurn ? `${renderInlineNote(state.submitted, "Your turn is complete for this round.")}<form id="sentenceForm" class="stack"><textarea id="sentenceInput" ${disabledAttr(state.submitted)}></textarea><button type="submit" ${disabledAttr(state.submitted)}>Submit new sentence</button></form>` : `<p class="small">Waiting for ${escapeHtml(playerName(game.turnPlayerId))}.</p>`}</div><div class="card"><h3>History</h3><div class="stack">${history || '<div class="small">No edits yet.</div>'}</div></div>`;
  }
  return `<div class="card"><h2 class="phase-title">Sentence history</h2><div class="prompt-box"><strong>Final sentence:</strong> ${escapeHtml(game.currentSentence)}</div>${roomState.phase === "voting" ? `<p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}` : ""}<div class="stack">${history || '<div class="small">No edits recorded.</div>'}</div></div>`;
}

function renderSecretObjective() {
  const game = roomState.game;
  const state = actionState();
  const chatHtml = game.chat.length
    ? game.chat
        .map(
          (message) =>
            `<div class="message-card"><strong>${escapeHtml(message.playerName)}:</strong> ${escapeHtml(message.text)}</div>`,
        )
        .join("")
    : '<div class="small">No messages yet.</div>';
  if (roomState.phase === "interaction")
    return `<div class="card"><h2 class="phase-title">Secret Objective</h2><div class="prompt-box">Conversation starter: ${escapeHtml(game.prompt)}</div><div class="stack">${chatHtml}</div><form id="chatForm" class="stack spaced-top"><input id="chatInput" maxlength="160" placeholder="Send a message into the round..." /><button type="submit">Send message</button></form></div>`;
  if (roomState.phase === "guessing")
    return `<div class="card"><h2 class="phase-title">Guess one objective</h2><p class="small">Guesses: ${game.guessesCount}/${roomState.players.length}</p><div class="stack">${chatHtml}</div>${renderInlineNote(state.guessed, "Guess submitted. Waiting for the reveal.")}<form id="secretGuessForm" class="stack spaced-top"><label>Target player<select id="targetSelect" ${disabledAttr(state.guessed)}>${roomState.players
      .filter((player) => player.id !== roomState.selfId)
      .map(
        (player) =>
          `<option value="${player.id}">${escapeHtml(player.name)}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Objective guess<select id="objectiveSelect" ${disabledAttr(state.guessed)}>${game.objectives.map((objective) => `<option value="${escapeHtml(objective)}">${escapeHtml(objective)}</option>`).join("")}</select></label><label class="check-row"><input id="completedCheck" type="checkbox" ${disabledAttr(state.guessed)} /> <span>I completed my secret objective</span></label><button type="submit" ${disabledAttr(state.guessed)}>Submit guess</button></form></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><div class="stack">${game.assignments.map((item) => `<div class="message-card"><strong>${escapeHtml(item.playerName)}</strong><div>${escapeHtml(item.objective)}</div><div class="small">Claimed complete: ${game.completionClaims[item.playerId] ? "Yes" : "No"}</div></div>`).join("")}</div></div>`;
}

function renderSpeedLies() {
  const game = roomState.game;
  const state = actionState();
  if (roomState.phase === "answering")
    return `<div class="card"><h2 class="phase-title">Speed Lies</h2><div class="prompt-box">${escapeHtml(game.prompt)}</div><p class="small">Your assignment is visible in your private info. Answer fast.</p>${renderEditableSubmissionNote(state.submitted, "Answer saved")}<form id="mainTextForm" class="stack"><textarea id="mainText" maxlength="160" placeholder="Type your answer..."></textarea><button type="submit">Submit answer</button></form></div>`;
  return `<div class="card"><h2 class="phase-title">Speed Lies</h2><div class="prompt-box">${escapeHtml(game.prompt)}</div>${roomState.phase === "voting" ? `<p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}` : ""}<div class="choice-grid">${game.answers.filter((answer) => roomState.phase !== "voting" || answer.playerId !== roomState.selfId).map((answer) => `<div class="choice-card"><strong>${escapeHtml(answer.playerName)}</strong><div>${escapeHtml(answer.text)}</div>${roomState.phase === "voting" ? `<button data-action="vote-player" data-player="${answer.playerId}" ${disabledAttr(state.voted)}>Vote liar</button>` : `<div class="small">Role: ${escapeHtml(answer.role || "Hidden")}</div>`}</div>`).join("")}</div></div>`;
}

function renderClip(clip) {
  if (!clip) return '<div class="small">No clip submitted.</div>';
  if (clip.kind === "text")
    return `<div class="message-card"><strong>Text fallback:</strong> ${escapeHtml(clip.text)}</div>`;
  return `<audio controls src="${clip.dataUrl}"></audio>`;
}

function renderVoiceSwap() {
  const game = roomState.game;
  const state = actionState();
  if (roomState.phase === "recording")
    return `<div class="card"><h2 class="phase-title">Voice Swap</h2><div class="prompt-box">${escapeHtml(game.prompt)}</div><p class="small">Recorded clips: ${game.recordingsCount}/${roomState.players.length}</p>${renderEditableSubmissionNote(state.submitted, "Clip saved")}<div class="button-row wrap"><button data-action="start-recording" ${disabledAttr(mediaRecorder && mediaRecorder.state === "recording")}>Start recording</button><button class="secondary" data-action="stop-recording" ${disabledAttr(!(mediaRecorder && mediaRecorder.state === "recording"))}>Stop recording</button></div><div class="spacer-sm"></div><div class="card"><h3>Your draft clip</h3>${voiceDraft ? renderClip(voiceDraft) : '<div class="small">No draft clip yet.</div>'}<div class="spacer-sm"></div><div class="button-row wrap"><button data-action="submit-recording" ${disabledAttr(!voiceDraft)}>Submit recorded clip</button><button class="secondary" data-action="clear-recording" ${disabledAttr(!voiceDraft)}>Discard draft</button></div></div><div class="spacer-sm"></div><form id="voiceFallbackForm" class="stack"><input id="voiceFallbackInput" maxlength="120" placeholder="Microphone not working? Type a text fallback." /><button type="submit">Submit text fallback</button></form></div>`;
  if (roomState.phase === "guessing")
    return `<div class="card"><h2 class="phase-title">Guess one identity</h2><p class="small">Guesses: ${game.guessesCount}/${roomState.players.length}</p>${renderInlineNote(state.guessed, "Guess submitted. Waiting for the reveal.")}<div class="entry-grid">${game.entries.map((entry) => `<div class="audio-card"><div class="vote-badge">Clip ${escapeHtml(entry.entryId)}</div><div class="spacer-xs"></div>${renderClip(entry.clip)}<div class="spacer-xs"></div><label>Who do you think this is?<select data-guess-entry="${entry.entryId}" class="voiceGuessSelect" ${disabledAttr(state.guessed)}>${roomState.players.map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join("")}</select></label><button data-action="submit-voice-guess" data-entry="${entry.entryId}" ${disabledAttr(state.guessed)}>Submit guess</button></div>`).join("")}</div></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><div class="entry-grid">${game.entries.map((entry) => `<div class="audio-card"><strong>${escapeHtml(entry.playerName || "Unknown")}</strong><div class="spacer-xs"></div>${renderClip(entry.clip)}</div>`).join("")}</div></div>`;
}

function renderOneWordStoryWar() {
  const game = roomState.game;
  const state = actionState();
  if (roomState.phase === "editing") {
    const yourTurn = game.turnPlayerId === roomState.selfId;
    return `<div class="card"><h2 class="phase-title">One Word Story War</h2><div class="story-view">${escapeHtml(game.story)}</div><p class="small">Add one word only.</p>${yourTurn ? `${renderInlineNote(state.submitted, "Your word is in. Waiting for the round to finish.")}<form id="wordForm" class="stack"><input id="wordInput" maxlength="24" placeholder="One word" ${disabledAttr(state.submitted)} /><button type="submit" ${disabledAttr(state.submitted)}>Add word</button></form>` : `<p class="small">Waiting for ${escapeHtml(playerName(game.turnPlayerId))}.</p>`}</div><div class="card"><h3>Contributions</h3><div class="inline-list">${game.additions.map((item) => `<span class="tag">${escapeHtml(item.playerName)}: ${escapeHtml(item.word)}</span>`).join("") || '<span class="small">No words added yet.</span>'}</div></div>`;
  }
  if (roomState.phase === "voting")
    return `<div class="card"><h2 class="phase-title">Vote for the best contributor</h2><div class="story-view">${escapeHtml(game.story)}</div><p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}<div class="choice-grid spaced-top">${roomState.players
      .filter((player) => player.id !== roomState.selfId)
      .map(
        (player) =>
          `<div class="choice-card"><strong>${escapeHtml(player.name)}</strong><div class="small">Words: ${
            game.additions
              .filter((item) => item.playerName === player.name)
              .map((item) => escapeHtml(item.word))
              .join(", ") || "-"
          }</div><button data-action="vote-player" data-player="${player.id}" ${disabledAttr(state.voted)}>Vote ${escapeHtml(player.name)}</button></div>`,
      )
      .join("")}</div></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><div class="story-view">${escapeHtml(game.story)}</div><div class="stack spaced-top">${game.roles.map((item) => `<div class="message-card"><strong>${escapeHtml(item.playerName)}</strong><div>${escapeHtml(item.role)}</div></div>`).join("")}</div></div>`;
}

function renderSuspiciousOne() {
  const game = roomState.game;
  const state = actionState();
  if (roomState.phase === "writing")
    return `<div class="card"><h2 class="phase-title">The Suspicious One</h2><div class="prompt-box">Use your private prompt/instruction to craft an answer.</div><p class="small">Submitted: ${game.submissionsCount}/${roomState.players.length}</p>${renderEditableSubmissionNote(state.submitted, "Answer saved")}<form id="mainTextForm" class="stack"><textarea id="mainText" maxlength="180" placeholder="Type your answer..."></textarea><button type="submit">Submit answer</button></form></div>`;
  if (roomState.phase === "voting")
    return `<div class="card"><h2 class="phase-title">Vote for the suspicious answer</h2><p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}<div class="entry-grid">${game.entries.map((entry) => `<div class="entry-card"><div>${escapeHtml(entry.text)}</div><div class="spacer-sm"></div><button data-action="vote-entry" data-entry="${entry.entryId}" ${disabledAttr(state.voted)}>Vote this answer</button></div>`).join("")}</div></div>`;
  return `<div class="card"><h2 class="phase-title">Reveal</h2><div class="prompt-box"><strong>Base prompt:</strong> ${escapeHtml(game.reveal.base)}</div><div class="prompt-box"><strong>Suspicious prompt:</strong> ${escapeHtml(game.reveal.suspicious)}</div><p><strong>Suspicious player:</strong> ${escapeHtml(playerName(game.reveal.suspiciousId))}</p><div class="stack">${game.reveal.entries.map((entry) => `<div class="message-card ${entry.playerId === game.reveal.suspiciousId ? "active" : ""}"><strong>${escapeHtml(entry.playerName)}</strong><div>${escapeHtml(entry.text)}</div></div>`).join("")}</div></div>`;
}

function renderMemoryTrap() {
  const game = roomState.game;
  const state = actionState();
  if (roomState.phase === "collecting")
    return `<div class="card"><h2 class="phase-title">Memory Trap</h2><div class="prompt-box">Prompt ${game.currentPromptIndex + 1}/${game.prompts.length}: ${escapeHtml(game.prompts[game.currentPromptIndex])}</div><p class="small">Players who have answered at least one memory: ${game.answersCount}/${roomState.players.length}</p>${renderEditableSubmissionNote(state.submitted, "Memory saved")}<form id="mainTextForm" class="stack"><input id="mainText" maxlength="80" placeholder="Type your memory answer..." /><button type="submit">Submit memory</button></form></div>`;
  return `<div class="card"><h2 class="phase-title">Memory Trap</h2>${roomState.phase === "voting" ? `<p class="small">Votes: ${game.votesCount}/${roomState.players.length}</p>${renderInlineNote(state.voted, "Vote locked in. Waiting for the reveal.")}` : ""}<div class="entry-grid">${game.trapCards.map((card) => `<div class="entry-card ${card.cardId === game.alteredCardId ? "active" : ""}"><div>${escapeHtml(card.text)}</div>${roomState.phase === "voting" ? `<button data-action="vote-card" data-card="${card.cardId}" ${disabledAttr(state.voted)}>Vote fake memory</button>` : ""}${roomState.phase === "reveal" && card.cardId === game.alteredCardId ? '<div class="vote-badge">Altered</div>' : ""}</div>`).join("")}</div></div>`;
}

function wireDynamicControls() {
  const mainTextForm = $("mainTextForm");
  if (mainTextForm)
    mainTextForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "submitText", value: $("mainText").value },
        });
        $("mainText").value = "";
      } catch (err) {
        handleError(err);
      }
    });

  const chatForm = $("chatForm");
  if (chatForm)
    chatForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "chat", value: $("chatInput").value },
        });
        $("chatInput").value = "";
      } catch (err) {
        handleError(err);
      }
    });

  const secretGuessForm = $("secretGuessForm");
  if (secretGuessForm)
    secretGuessForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (actionState().guessed) return;
      try {
        await postWithSession("/api/player-action", {
          payload: {
            type: "submitSecretGuess",
            targetId: $("targetSelect").value,
            objective: $("objectiveSelect").value,
            completed: $("completedCheck").checked,
          },
        });
      } catch (err) {
        handleError(err);
      }
    });

  const sentenceForm = $("sentenceForm");
  if (sentenceForm)
    sentenceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (actionState().submitted || !actionState().canEdit) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "submitSentence", value: $("sentenceInput").value },
        });
      } catch (err) {
        handleError(err);
      }
    });

  const wordForm = $("wordForm");
  if (wordForm)
    wordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (actionState().submitted || !actionState().canEdit) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "submitWord", value: $("wordInput").value },
        });
        $("wordInput").value = "";
      } catch (err) {
        handleError(err);
      }
    });

  const voiceFallbackForm = $("voiceFallbackForm");
  if (voiceFallbackForm)
    voiceFallbackForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await postWithSession("/api/player-action", {
          payload: {
            type: "submitAudio",
            clip: { kind: "text", text: $("voiceFallbackInput").value.trim() },
          },
        });
        $("voiceFallbackInput").value = "";
      } catch (err) {
        handleError(err);
      }
    });

  document.querySelectorAll('[data-action="select-mode"]').forEach((button) =>
    button.addEventListener("click", async () => {
      if (!isHost() || roomState?.status !== "lobby") return;
      $("modeSelect").value = button.dataset.mode;
      try {
        await saveLobbySettings();
        showNotice(
          `${modesMeta[button.dataset.mode]?.name || "Mode"} selected.`,
          "success",
        );
      } catch (err) {
        handleError(err);
      }
    }),
  );

  document.querySelectorAll('[data-action="vote-entry"]').forEach((button) =>
    button.addEventListener("click", async () => {
      if (actionState().voted) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "vote", entryId: button.dataset.entry },
        });
      } catch (err) {
        handleError(err);
      }
    }),
  );

  document.querySelectorAll('[data-action="vote-player"]').forEach((button) =>
    button.addEventListener("click", async () => {
      if (actionState().voted) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "votePlayer", playerId: button.dataset.player },
        });
      } catch (err) {
        handleError(err);
      }
    }),
  );

  document.querySelectorAll('[data-action="vote-card"]').forEach((button) =>
    button.addEventListener("click", async () => {
      if (actionState().voted) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "vote", cardId: button.dataset.card },
        });
      } catch (err) {
        handleError(err);
      }
    }),
  );

  document.querySelectorAll('[data-action="guess-rule"]').forEach((button) =>
    button.addEventListener("click", async () => {
      if (actionState().guessed) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "guessRule", value: button.dataset.value },
        });
      } catch (err) {
        handleError(err);
      }
    }),
  );

  document
    .querySelectorAll('[data-action="submit-voice-guess"]')
    .forEach((button) =>
      button.addEventListener("click", async () => {
        if (actionState().guessed) return;
        try {
          const entryId = button.dataset.entry;
          const select = document.querySelector(
            `select[data-guess-entry="${entryId}"]`,
          );
          await postWithSession("/api/player-action", {
            payload: {
              type: "submitVoiceGuess",
              entryId,
              playerId: select.value,
            },
          });
        } catch (err) {
          handleError(err);
        }
      }),
    );

  const recordBtn = document.querySelector('[data-action="start-recording"]');
  if (recordBtn) recordBtn.addEventListener("click", startRecording);

  const stopBtn = document.querySelector('[data-action="stop-recording"]');
  if (stopBtn) stopBtn.addEventListener("click", stopRecording);

  const submitClipBtn = document.querySelector(
    '[data-action="submit-recording"]',
  );
  if (submitClipBtn)
    submitClipBtn.addEventListener("click", async () => {
      if (!voiceDraft) return;
      try {
        await postWithSession("/api/player-action", {
          payload: { type: "submitAudio", clip: voiceDraft },
        });
        voiceDraft = null;
      } catch (err) {
        handleError(err);
      }
    });

  const clearClipBtn = document.querySelector(
    '[data-action="clear-recording"]',
  );
  if (clearClipBtn)
    clearClipBtn.addEventListener("click", () => {
      voiceDraft = null;
      showNotice("Draft recording discarded.", "info");
      render();
    });
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordChunks.push(event.data);
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordChunks, {
        type: mediaRecorder.mimeType || "audio/webm",
      });
      const dataUrl = await blobToDataUrl(blob);
      voiceDraft = {
        kind: "audio",
        dataUrl,
        mimeType: blob.type || "audio/webm",
      };
      mediaRecorder = null;
      stream.getTracks().forEach((track) => track.stop());
      render();
    };
    mediaRecorder.start();
    render();
  } catch (_) {
    showNotice(
      "Microphone access failed. You can use the text fallback instead.",
      "error",
    );
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording")
    mediaRecorder.stop();
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

(async function init() {
  renderConnection("Connecting...");
  try {
    await fetchModes();
  } catch (err) {
    handleError(err);
  }

  if (session) startPolling();
  else render();
})();
