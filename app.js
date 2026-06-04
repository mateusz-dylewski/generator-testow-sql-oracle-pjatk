(function () {
  const STORAGE_KEY = 'oracle-sql-trainer-v2';

  const state = {
    mode: 'practice',
    difficulty: 'medium',
    currentTask: null,
    hintLevel: 0,
    learnStepIndex: 0,
    learnComplete: false,
    exam: { tasks: [], index: 0, scores: [], timerId: null, secondsLeft: 25 * 60 },
    stats: { solved: 0, streak: 0, xp: 0, lastScore: 0 },
  };

  const $ = (sel) => document.querySelector(sel);

  const els = {
    prompt: $('#task-prompt'),
    topic: $('#task-topic'),
    hint: $('#task-hint'),
    editor: $('#sql-editor'),
    feedback: $('#feedback'),
    solutionBox: $('#solution-box'),
    solutionCode: $('#solution-code'),
    solutionNote: $('#solution-note'),
    examBar: $('#exam-bar'),
    examCurrent: $('#exam-current'),
    timer: $('#timer'),
    statSolved: $('#stat-solved'),
    statStreak: $('#stat-streak'),
    statXp: $('#stat-xp'),
    examDialog: $('#exam-result'),
    examScoreText: $('#exam-score-text'),
    examBreakdown: $('#exam-breakdown'),
    erTrigger: $('#er-zoom-trigger'),
    erDiagram: $('#er-diagram'),
    erLightbox: $('#er-lightbox'),
    erLightboxBody: $('#er-lightbox-body'),
    learnPanel: $('#learn-panel'),
    learnStepNum: $('#learn-step-num'),
    learnStepTotal: $('#learn-step-total'),
    learnProgressFill: $('#learn-progress-fill'),
    learnProgressBar: $('#learn-progress-bar'),
    learnLead: $('#learn-lead'),
    learnInstruction: $('#learn-instruction'),
    learnCodeTarget: $('#learn-code-target'),
    btnLearnStep: $('#btn-learn-step'),
  };

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(state.stats, JSON.parse(raw));
    } catch (_) {}
    renderStats();
  }

  function saveStats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
    renderStats();
  }

  function renderStats() {
    els.statSolved.textContent = state.stats.solved;
    els.statStreak.textContent = state.stats.streak;
    els.statXp.textContent = state.stats.xp;
  }

  function setExamUI(isExam) {
    document.body.classList.toggle('exam-mode', isExam);
    if (isExam) setLearnUI(false);
  }

  function setLearnUI(isLearn) {
    document.body.classList.toggle('learn-mode', isLearn);
    els.learnPanel?.classList.toggle('hidden', !isLearn);
    document.querySelectorAll('.learn-only').forEach((el) => {
      el.classList.toggle('hidden', !isLearn);
    });
    document.querySelectorAll('.learn-hide').forEach((el) => {
      el.classList.toggle('hidden', isLearn);
    });
    if (els.btnLearnStep) {
      els.btnLearnStep.textContent = isLearn ? 'Dalej' : 'Dalej';
    }
  }

  function getLearnSteps() {
    return state.currentTask?.learnSteps || [];
  }

  function renderLearnStep() {
    const steps = getLearnSteps();
    const step = steps[state.learnStepIndex];
    if (!step || !els.learnPanel) return;

    const total = steps.length;
    const num = state.learnStepIndex + 1;
    const pct = Math.round((num / total) * 100);

    els.learnStepNum.textContent = num;
    els.learnStepTotal.textContent = total;
    els.learnProgressFill.style.width = `${pct}%`;
    if (els.learnProgressBar) {
      els.learnProgressBar.setAttribute('aria-valuenow', String(pct));
    }

    els.learnLead.textContent = step.lead || (step.kind === 'hint' ? 'Podpowiedź:' : '');
    els.learnInstruction.textContent = step.instruction;

    if (step.kind === 'write' && step.codeLine) {
      els.learnCodeTarget.textContent = step.codeLine;
      els.learnCodeTarget.classList.remove('hidden');
    } else {
      els.learnCodeTarget.classList.add('hidden');
      els.learnCodeTarget.textContent = '';
    }

    if (step.kind === 'hint') {
      els.btnLearnStep.textContent = 'Rozumiem — przechodzę dalej';
    } else if (step.kind === 'finish') {
      els.btnLearnStep.textContent = state.learnComplete ? 'Następne zadanie' : 'Sprawdź całe zapytanie';
    } else {
      els.btnLearnStep.textContent = 'Sprawdź ten krok';
    }
  }

  function validateLearnStep(sql, step) {
    const n = normalizeSql(sql);

    if (step.kind === 'hint') {
      return { ok: true, message: 'Przejdź do wpisywania SQL — zacznij od pierwszej linii SELECT.' };
    }

    if (step.kind === 'write') {
      const tokens = step.tokens || [];
      if (!tokens.length) {
        return { ok: n.length > 5, message: 'Wpisz linię w edytorze.' };
      }
      const missing = tokens.filter((t) => !n.includes(t));
      const ok = missing.length <= Math.max(0, Math.floor(tokens.length * 0.2));
      return {
        ok,
        message: ok
          ? 'Świetnie — ta linia jest w zapytaniu. Przechodzimy dalej.'
          : `Brakuje fragmentów z podpowiedzi: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`,
        missing,
      };
    }

    if (step.kind === 'finish') {
      const result = scoreQuery(sql, state.currentTask);
      return {
        ok: result.points >= 1,
        message: result.points >= 1
          ? 'Zadanie w trybie nauka ukończone!'
          : result.messages?.[0] || 'Uzupełnij zapytanie według wszystkich kroków.',
        points: result.points,
      };
    }

    return { ok: false, message: 'Nieznany krok.' };
  }

  function advanceLearnStep() {
    const steps = getLearnSteps();
    if (state.learnStepIndex < steps.length - 1) {
      state.learnStepIndex += 1;
      renderLearnStep();
      return false;
    }
    state.learnComplete = true;
    return true;
  }

  function onLearnStep() {
    const steps = getLearnSteps();
    const step = steps[state.learnStepIndex];
    if (!step) return;

    if (state.learnComplete) {
      state.learnComplete = false;
      nextPracticeTask();
      return;
    }

    if (step.kind === 'hint') {
      els.feedback.classList.remove('hidden');
      els.feedback.className = 'feedback success';
      els.feedback.innerHTML = `<strong>Krok ${state.learnStepIndex + 1}</strong><ul><li>${validateLearnStep(els.editor.value, step).message}</li></ul>`;
      advanceLearnStep();
      return;
    }

    const result = validateLearnStep(els.editor.value, step);
    els.feedback.classList.remove('hidden');
    els.feedback.className = `feedback ${result.ok ? 'success' : 'error'}`;
    els.feedback.innerHTML = `<strong>Krok ${state.learnStepIndex + 1} / ${steps.length}</strong><ul><li>${result.message}</li></ul>`;

    if (!result.ok) return;

    if (step.kind === 'finish') {
      state.stats.solved += 1;
      state.stats.streak += 1;
      state.stats.xp += 15;
      saveStats();
      state.learnComplete = true;
      els.btnLearnStep.textContent = 'Następne zadanie';
      els.feedback.innerHTML += '<ul><li>Możesz przejść do kolejnego zadania.</li></ul>';
      return;
    }

    advanceLearnStep();
  }

  function startLearnTask() {
    state.learnStepIndex = 0;
    state.learnComplete = false;
    renderLearnStep();
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function normalizeSql(sql) {
    return sql
      .toLowerCase()
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--.*$/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const ORACLE_MARKERS = ['nvl', 'rownum', 'fetch', 'offset', '||', 'decode', 'to_char', 'to_date'];

  function hasOracleSyntax(n) {
    return ORACLE_MARKERS.some((m) => n.includes(m));
  }

  function scoreQuery(sql, task) {
    const n = normalizeSql(sql);
    if (!n || n.length < 10) {
      return { points: 0, max: 2, messages: ['Zapytanie jest puste lub za krótkie.'] };
    }

    const messages = [];
    let points = 0;
    const keywords = (task.checkKeywords || []).map((k) => k.toLowerCase());
    const matched = keywords.filter((k) => n.includes(k));
    const ratio = keywords.length ? matched.length / keywords.length : 0;

    if (ratio >= 0.6) {
      points += 1;
      messages.push('✓ Struktura zapytania wygląda sensownie (tabele/warunki Oracle).');
    } else {
      messages.push('△ Sprawdź tabele i warunki — patrz diagram ER w panelu bocznym.');
    }

    const hasSelect = n.includes('select') && n.includes('from');
    if (hasSelect) {
      points += 0.4;
      messages.push('✓ Poprawny szkielet SELECT … FROM.');
    }

    if (task.difficulty === 'medium' || task.difficulty === 'hard' || task.difficulty === 'expert') {
      if (n.includes('group by') || n.includes('join')) {
        points += 0.2;
      }
      if (n.includes('round(')) {
        points += 0.2;
        messages.push('✓ ROUND — składnia Oracle.');
      }
    }

    if (task.difficulty === 'hard' || task.difficulty === 'expert') {
      if (n.includes('having') || n.includes('exists') || n.includes('fetch') || n.includes('rownum')) {
        points += 0.2;
      }
    }

    if (task.difficulty === 'expert' && hasOracleSyntax(n)) {
      points += 0.3;
      messages.push('✓ Składnia Oracle (NVL / ROWNUM / FETCH / OFFSET / ||).');
    } else if (hasOracleSyntax(n)) {
      points += 0.2;
      messages.push('✓ Używasz składni specyficznej dla Oracle.');
    }

    if (task.oracleBonus) {
      const bonus = task.oracleBonus.some((b) => n.includes(b.toLowerCase()));
      if (bonus) {
        points += 0.2;
        messages.push('✓ FETCH FIRST lub ROWNUM — zgodnie ze wzorcem.');
      }
    }

    if (state.mode === 'exam' && !hasOracleSyntax(n) && task.difficulty === 'expert') {
      messages.push('△ Na tym poziomie oczekiwana składnia Oracle (np. FETCH, NVL, ROWNUM).');
    }

    points = Math.min(2, Math.round(points * 10) / 10);
    if (points >= 1.5) messages.push('Dobra robota — zweryfikuj wynik w Oracle Live SQL.');
    return { points, max: 2, messages, ratio };
  }

  function showTask(task) {
    state.currentTask = task;
    state.hintLevel = 0;
    state.learnStepIndex = 0;
    state.learnComplete = false;
    els.prompt.textContent = task.prompt;
    els.topic.textContent = task.topic;
    els.hint.classList.add('hidden');
    els.hint.textContent = '';
    els.feedback.classList.add('hidden');
    els.solutionBox.classList.add('hidden');
    els.editor.value = '';

    if (state.mode === 'exam') {
      els.examCurrent.textContent = state.exam.index + 1;
    }

    if (state.mode === 'learn') {
      startLearnTask();
    }
  }

  function nextPracticeTask() {
    showTask(generateTask(state.difficulty));
  }

  function startExam() {
    setLearnUI(false);
    setExamUI(true);
    state.exam = {
      tasks: generateExamSet(state.difficulty, 10),
      index: 0,
      scores: [],
      timerId: null,
      secondsLeft: 25 * 60,
    };
    els.examBar.classList.remove('hidden');
    els.timer.textContent = formatTime(state.exam.secondsLeft);
    if (state.exam.timerId) clearInterval(state.exam.timerId);
    state.exam.timerId = setInterval(() => {
      state.exam.secondsLeft -= 1;
      els.timer.textContent = formatTime(state.exam.secondsLeft);
      if (state.exam.secondsLeft <= 0) finishExam();
    }, 1000);
    showTask(state.exam.tasks[0]);
  }

  function finishExam() {
    if (state.exam.timerId) {
      clearInterval(state.exam.timerId);
      state.exam.timerId = null;
    }
    const total = state.exam.scores.reduce((a, s) => a + s.points, 0);
    const max = Math.max(state.exam.scores.length * 2, 1);
    els.examScoreText.textContent = `Uzyskano ${total} / ${max} punktów (${Math.round((total / max) * 100)}%)`;
    els.examBreakdown.innerHTML = state.exam.scores
      .map(
        (s, i) =>
          `<li>Zadanie ${i + 1}: ${s.points}/2 — ${s.task.topic}</li>`
      )
      .join('');
    els.examDialog.showModal();
    els.examBar.classList.add('hidden');
    setExamUI(false);
    switchMode('practice');
  }

  function onCheck() {
    const task = state.currentTask;
    if (!task) return;
    const result = scoreQuery(els.editor.value, task);

    if (result.points >= 1) {
      state.stats.solved += 1;
      state.stats.streak += 1;
      state.stats.xp += Math.round(result.points * 10);
    } else {
      state.stats.streak = 0;
    }
    saveStats();

    els.feedback.classList.remove('hidden');
    els.feedback.className = `feedback ${result.points >= 1.5 ? 'success' : result.points >= 1 ? 'warn' : 'error'}`;
    els.feedback.innerHTML = `<strong>${result.points} / ${result.max} pkt</strong><ul>${result.messages
      .map((m) => `<li>${m}</li>`)
      .join('')}</ul>`;

    if (state.mode === 'exam') {
      state.exam.scores.push({ points: result.points, task, ratio: Math.round((result.ratio || 0) * 100) });
    }
  }

  function onHint() {
    if (state.mode === 'exam') return;
    const task = state.currentTask;
    if (!task?.hints?.length) return;
    const hint = task.hints[Math.min(state.hintLevel, task.hints.length - 1)];
    state.hintLevel += 1;
    els.hint.textContent = `Podpowiedź ${state.hintLevel}: ${hint}`;
    els.hint.classList.remove('hidden');
    state.stats.xp = Math.max(0, state.stats.xp - 2);
    saveStats();
  }

  function onSolution() {
    if (state.mode === 'exam') return;
    const task = state.currentTask;
    if (!task) return;
    els.solutionCode.textContent = task.solution;
    els.solutionNote.textContent =
      'Wzorcowe rozwiązanie Oracle — uruchom schema.sql i przetestuj zapytanie.';
    els.solutionBox.classList.remove('hidden');
    state.stats.streak = 0;
    saveStats();
  }

  function onNext() {
    if (state.mode === 'learn') {
      if (state.learnComplete) {
        nextPracticeTask();
      }
      return;
    }
    if (state.mode === 'exam') {
      if (state.exam.scores.length <= state.exam.index) {
        onCheck();
      }
      state.exam.index += 1;
      if (state.exam.index >= state.exam.tasks.length) {
        finishExam();
        return;
      }
      showTask(state.exam.tasks[state.exam.index]);
      return;
    }
    nextPracticeTask();
  }

  function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    state.mode = mode;
    setExamUI(false);
    setLearnUI(mode === 'learn');
    els.examBar.classList.add('hidden');
    if (state.exam.timerId) clearInterval(state.exam.timerId);

    if (mode === 'exam') {
      startExam();
      return;
    }
    nextPracticeTask();
  }

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  $('#difficulty').addEventListener('change', (e) => {
    state.difficulty = e.target.value;
    if (state.mode !== 'exam') nextPracticeTask();
  });

  $('#btn-hint').addEventListener('click', onHint);
  $('#btn-check').addEventListener('click', onCheck);
  $('#btn-next').addEventListener('click', onNext);
  els.btnLearnStep?.addEventListener('click', onLearnStep);
  $('#btn-solution').addEventListener('click', onSolution);
  $('#finish-exam').addEventListener('click', finishExam);
  $('#close-exam-result').addEventListener('click', () => els.examDialog.close());

  function openErLightbox() {
    const clone = els.erDiagram.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('er-diagram--large');
    clone.setAttribute('aria-hidden', 'false');
    clone.innerHTML = clone.innerHTML.replace(/er-arrow/g, 'er-arrow-lg');
    const marker = clone.querySelector('#er-arrow-lg');
    if (marker) marker.id = 'er-arrow-lg';

    els.erLightboxBody.innerHTML = '';
    els.erLightboxBody.appendChild(clone);
    els.erLightbox.showModal();
  }

  function closeErLightbox() {
    els.erLightbox.close();
    els.erLightboxBody.innerHTML = '';
  }

  els.erTrigger?.addEventListener('click', openErLightbox);
  $('#close-er-lightbox')?.addEventListener('click', closeErLightbox);
  els.erLightbox?.addEventListener('click', (e) => {
    if (e.target === els.erLightbox) closeErLightbox();
  });
  els.erLightbox?.addEventListener('cancel', () => {
    els.erLightboxBody.innerHTML = '';
  });

  $('#copy-schema').addEventListener('click', async () => {
    const ddl = await fetch('schema.sql').then((r) => r.text()).catch(() => SCHEMA_DDL);
    await navigator.clipboard.writeText(ddl);
    $('#copy-schema').textContent = 'Skopiowano!';
    setTimeout(() => { $('#copy-schema').textContent = 'Kopiuj DDL (Oracle)'; }, 2000);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onCheck();
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      onNext();
    }
  });

  loadStats();
  setExamUI(false);
  setLearnUI(false);
  nextPracticeTask();
})();
