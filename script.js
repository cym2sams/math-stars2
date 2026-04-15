// --- 乘法星星榜 (最終穩定版 - 帶自我診斷) ---
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    
    // =============================================================
    // 1. Firebase 配置與自我診斷
    // =============================================================
    const firebaseConfig = {
        // 【【【 請將這裡替換成您自己的 firebaseConfig 】】】
        apiKey: "AIzaSy_PLACEHOLDER_REPLACE_ME",
        authDomain: "your-project-id.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project-id.appspot.com",
        messagingSenderId: "1234567890",
        appId: "1:1234567890:web:abcdef123456"
    };

    // 自我診斷：檢查 firebaseConfig 是否已被替換
    if (firebaseConfig.apiKey.includes("PLACEHOLDER")) {
        alert("嚴重錯誤：Firebase 配置不正確！\n\n請打開 script.js 檔案，找到 'firebaseConfig'，並用您自己的 Firebase 專案設定替換掉模板內容。");
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>配置錯誤</h1><p>遊戲無法啟動，因為 Firebase 未被正確配置。</p></div>`;
        return; // 終止所有後續程式碼的執行
    }

    // =============================================================
    // 2. 應用程式初始化
    // =============================================================
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        alert("Firebase 初始化失敗，請檢查您的 firebaseConfig 是否格式正確，或網絡連接是否正常。");
        console.error(e);
        return;
    }
    
    const db = firebase.firestore();
    const leaderboardCollection = db.collection('leaderboard');
    
    // =============================================================
    // 3. 立即執行的主函數
    // =============================================================
    function main() {
        // ... (這裡的程式碼與之前的版本完全相同，只是放在了 Firebase 初始化成功之後)
        // ... (為簡潔起見，省略重複的程式碼，請您直接複製貼上即可)
        const ELEMENTS = {
            screens: { start: document.getElementById('start-screen'), rules: document.getElementById('rules-screen'), game: document.getElementById('game-screen'), end: document.getElementById('end-screen'), leaderboard: document.getElementById('leaderboard-screen') },
            classSelect: document.getElementById('class-select'), nameSelect: document.getElementById('name-select'),
            nextBtn: document.getElementById('next-btn'), startGameBtn: document.getElementById('start-game-btn'), playAgainBtn: document.getElementById('play-again-btn'), skipBtn: document.getElementById('skip-btn'),
            answerButtons: document.querySelectorAll('.btn-answer'), timerDisplay: document.getElementById('timer'), scoreDisplay: document.getElementById('score'),
            questionArea: document.getElementById('question-area'), finalScoreText: document.getElementById('final-score-text'), rankInfoText: document.getElementById('rank-info-text'),
            aidBtn: document.getElementById('aid-btn'), aidOverlay: document.getElementById('aid-overlay'), aidContent: document.getElementById('aid-content'),
            correctSound: document.getElementById('correct-sound'), incorrectSound: document.getElementById('incorrect-sound'),
            leaderboardContainer: document.getElementById('leaderboard'), leaderboardMainContainer: document.getElementById('leaderboard-main'),
            viewLeaderboardBtn: document.getElementById('view-leaderboard-btn'), backToStartBtn: document.getElementById('back-to-start-btn'),
            stars: { small: document.getElementById('stars-small'), medium: document.getElementById('stars-medium'), large: document.getElementById('stars-large') }
        };
        let state = { timerId: null, timeLeft: 60, score: 0, currentUser: {}, currentCorrectAnswer: 0, currentQuestionNums: {}, isAnswering: false, isAidUsed: false };
        const CONSTANTS = { classes: { '2A': 25, '2B': 25, '2C': 25, '2D': 25, '2E': 25, '老師': ["陳子殷老師", "陳綺雯老師", "陳懿文老師", "楊靖霖老師", "陳慧淇老師"] } };

        const functions = {
            init() { functions.createStars(); functions.populateClassSelect(); functions.updateNameSelect(); functions.showScreen('start', 'instant'); functions.bindEvents(); },
            bindEvents() {
                ELEMENTS.classSelect.addEventListener('change', functions.updateNameSelect);
                ELEMENTS.nextBtn.addEventListener('click', () => { if (!ELEMENTS.classSelect.value || !ELEMENTS.nameSelect.value) return alert('請先選擇！'); const selectedClass = ELEMENTS.classSelect.value; const selectedName = ELEMENTS.nameSelect.options[ELEMENTS.nameSelect.selectedIndex].text; const fullName = (selectedClass === '老師') ? selectedName : `${selectedClass} ${selectedName}`; state.currentUser = { class: selectedClass, name: fullName }; functions.showScreen('rules'); });
                ELEMENTS.startGameBtn.addEventListener('click', functions.startGame);
                ELEMENTS.playAgainBtn.addEventListener('click', () => functions.showScreen('start'));
                ELEMENTS.answerButtons.forEach(btn => btn.addEventListener('click', functions.handleAnswerClick));
                ELEMENTS.skipBtn.addEventListener('click', () => { if (!state.isAnswering) functions.generateQuestion(); });
                ELEMENTS.aidBtn.addEventListener('click', functions.showVisualAid);
                ELEMENTS.aidOverlay.addEventListener('click', functions.hideVisualAid);
                ELEMENTS.viewLeaderboardBtn.addEventListener('click', async () => { await functions.displayLeaderboard(ELEMENTS.leaderboardMainContainer); functions.showScreen('leaderboard'); });
                ELEMENTS.backToStartBtn.addEventListener('click', () => functions.showScreen('start'));
            },
            showScreen(name, mode) { const c = document.querySelector('.screen.active'); const n = ELEMENTS.screens[name]; if (!n) return; if (c === n) return; if (c && mode !== 'instant') { c.classList.add('exiting'); c.classList.remove('active'); n.classList.remove('exiting'); n.classList.add('active'); setTimeout(() => c.classList.remove('exiting'), 400); } else { if (c) c.classList.remove('active'); n.classList.add('active'); } },
            updateScoreDisplay(type) { ELEMENTS.scoreDisplay.textContent = `⭐ x ${state.score}`; ['pulse-animation', 'wiggle-animation'].forEach(c => ELEMENTS.scoreDisplay.classList.remove(c)); void ELEMENTS.scoreDisplay.offsetWidth; if (type === 'pulse') ELEMENTS.scoreDisplay.classList.add('pulse-animation'); else if (type === 'wiggle') ELEMENTS.scoreDisplay.classList.add('wiggle-animation'); },
            handleAnswerClick(e) { if (state.isAnswering) return; state.isAnswering = true; const btn = e.target; const answer = parseInt(btn.textContent, 10); ELEMENTS.correctSound.pause(); ELEMENTS.correctSound.currentTime = 0; ELEMENTS.incorrectSound.pause(); ELEMENTS.incorrectSound.currentTime = 0; if (answer === state.currentCorrectAnswer) { state.score += state.isAidUsed ? 5 : 10; ELEMENTS.correctSound.play(); btn.classList.add('correct-flash'); functions.updateScoreDisplay('pulse'); } else { if (state.score > 0) functions.updateScoreDisplay('wiggle'); state.score -= 5; if (state.score < 0) state.score = 0; ELEMENTS.incorrectSound.play(); btn.classList.add('incorrect-shake'); if (ELEMENTS.answerButtons) { ELEMENTS.answerButtons.forEach(button => { if (parseInt(button.textContent, 10) === state.currentCorrectAnswer) button.classList.add('highlight-correct'); }); } } setTimeout(() => { ELEMENTS.scoreDisplay.textContent = `⭐ x ${state.score}`; functions.generateQuestion(); if (ELEMENTS.answerButtons) {ELEMENTS.answerButtons.forEach(button => button.classList.remove('correct-flash', 'incorrect-shake', 'highlight-correct'));} state.isAnswering = false; }, 800); },
            startGame() { Object.assign(state, { timeLeft: 60, score: 0, isAnswering: false, isAidUsed: false }); functions.updateScoreDisplay(); ELEMENTS.timerDisplay.textContent = `時間：${state.timeLeft}`; ELEMENTS.timerDisplay.classList.remove('timer-warning'); functions.showScreen('game'); functions.generateQuestion(); state.timerId = setInterval(() => { state.timeLeft--; ELEMENTS.timerDisplay.textContent = `時間：${state.timeLeft}`; if (state.timeLeft <= 10) ELEMENTS.timerDisplay.classList.add('timer-warning'); if (state.timeLeft <= 0) functions.endGame(); }, 1000); },
            async endGame() { clearInterval(state.timerId); ELEMENTS.timerDisplay.classList.remove('timer-warning'); ELEMENTS.finalScoreText.textContent = "正在結算成績..."; ELEMENTS.rankInfoText.textContent = ""; ELEMENTS.leaderboardContainer.innerHTML = ''; try { if (state.score > 0) await functions.saveToLeaderboard(state.currentUser.name, state.score); const rank = await functions.getPlayerRank(state.currentUser.name); let rankMessage = ""; if (rank > 0) { rankMessage = (rank === 1) ? "太棒了！你打破了最高紀錄，榮登榜首！👑" : `恭喜！你目前的排名是：第 ${rank} 名 🎉`; } else if (state.score > 0) { rankMessage = "加油！再努力一點就可以進入排行榜了！💪"; } ELEMENTS.finalScoreText.textContent = `${state.currentUser.name}，你獲得了 ${state.score} 顆星星！`; ELEMENTS.rankInfoText.textContent = rankMessage; } catch (error) { console.error("Firebase Error:", error); ELEMENTS.finalScoreText.textContent = "無法連接伺服器，成績未保存。"; } await functions.displayLeaderboard(ELEMENTS.leaderboardContainer, state.currentUser.name); functions.showScreen('end'); },
            async getPlayerRank(playerName) { const snapshot = await leaderboardCollection.orderBy('score', 'desc').get(); const allPlayers = snapshot.docs.map(doc => doc.data()); const playerIndex = allPlayers.findIndex(p => p.name === playerName); return playerIndex !== -1 ? playerIndex + 1 : -1; },
            async getLeaderboard() { const snapshot = await leaderboardCollection.orderBy('score', 'desc').limit(10).get(); return snapshot.docs.map(doc => doc.data()); },
            async saveToLeaderboard(playerName, playerScore) { const playerDocRef = leaderboardCollection.doc(playerName); const doc = await playerDocRef.get(); if (doc.exists) { if (playerScore > doc.data().score) await playerDocRef.update({ score: playerScore }); } else { await playerDocRef.set({ name: playerName, score: playerScore }); } },
            async displayLeaderboard(container, currentPlayerName = null) { container.innerHTML = '<h2>排行榜</h2>'; const board = await functions.getLeaderboard(); if (board.length === 0) { container.innerHTML += '<p>還沒有人上榜！</p>'; return; } const list = document.createElement('ol'); list.className = 'leaderboard-list'; board.forEach((p, i) => { const item = document.createElement('li'); item.className = 'leaderboard-item'; if (p.name === currentPlayerName) item.classList.add('current-player'); const nS = document.createElement('span'); nS.textContent = `${i + 1}. ${p.name}`; const sS = document.createElement('span'); sS.textContent = `⭐ ${p.score}`; item.appendChild(nS); item.appendChild(sS); list.appendChild(item); }); container.appendChild(list); },
            generateQuestion() { state.isAidUsed = false; const n1 = Math.floor(Math.random() * 11), n2 = Math.floor(Math.random() * 11); state.currentQuestionNums = { n1, n2 }; state.currentCorrectAnswer = n1 * n2; ELEMENTS.questionArea.textContent = `${n1} x ${n2} = ?`; let answers = [state.currentCorrectAnswer]; while (answers.length < 4) { const w = Math.floor(Math.random() * 101); if (!answers.includes(w)) answers.push(w); } for (let i = answers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [answers[i], answers[j]] = [answers[j], answers[i]]; } ELEMENTS.answerButtons.forEach((btn, i) => btn.textContent = answers[i]); },
            showVisualAid() { if (state.isAnswering) return; state.isAidUsed = true; state.isAnswering = true; ELEMENTS.aidContent.innerHTML = ''; const r = Math.min(state.currentQuestionNums.n1, state.currentQuestionNums.n2), c = Math.max(state.currentQuestionNums.n1, state.currentQuestionNums.n2); for (let i = 0; i < r; i++) { const row = document.createElement('div'); row.className = 'aid-row'; for (let j = 0; j < c; j++) { const obj = document.createElement('span'); obj.className = 'aid-object'; obj.textContent = '⭐'; row.appendChild(obj); } ELEMENTS.aidContent.appendChild(row); } ELEMENTS.aidOverlay.classList.add('active'); },
            hideVisualAid() { ELEMENTS.aidOverlay.classList.remove('active'); state.isAnswering = false; },
            populateClassSelect() { ELEMENTS.classSelect.innerHTML = ''; Object.keys(CONSTANTS.classes).forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; ELEMENTS.classSelect.appendChild(o); }); },
            updateNameSelect() { const c = ELEMENTS.classSelect.value; ELEMENTS.nameSelect.innerHTML = ''; if (c === '老師') CONSTANTS.classes[c].forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; ELEMENTS.nameSelect.appendChild(o); }); else for (let i = 1; i <= CONSTANTS.classes[c]; i++) { const o = document.createElement('option'); o.value = i; o.textContent = `${i}號`; ELEMENTS.nameSelect.appendChild(o); } },
            createStars() { const create = (count) => Array.from({ length: count }, () => `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`).join(','); if (ELEMENTS.stars.small) ELEMENTS.stars.small.style.boxShadow = create(700); if (ELEMENTS.stars.medium) ELEMENTS.stars.medium.style.boxShadow = create(200); if (ELEMENTS.stars.large) ELEMENTS.stars.large.style.boxShadow = create(100); }
        };
        functions.init();
    }
    main();
});
