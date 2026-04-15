// --- 乘法星星榜 (版本 1.7 - 修正結束畫面排行榜佈局) ---

document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    
    function main() {
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8-QHkTvltD4bsdrc5uEVLyVOMcFyLiaWWrOt4uL9D7Wbb46E1EBKAiYsdfHVp_W-r/exec";

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
            backToStartFromEndBtn: document.getElementById('back-to-start-from-end-btn'),
            stars: { small: document.getElementById('stars-small'), medium: document.getElementById('stars-medium'), large: document.getElementById('stars-large') }
        };

        let state = { timerId: null, timeLeft: 60, score: 0, currentUser: {}, currentCorrectAnswer: 0, currentQuestionNums: {}, isAnswering: false, isAidUsed: false, fullLeaderboard: null };
        const CONSTANTS = { classes: { '2A': 25, '2B': 25, '2C': 25, '2D': 25, '2E': 25, '老師': ["陳子殷老師", "陳綺雯老師", "陳懿文老師", "楊靖霖老師", "陳慧淇老師"] } };
        
        const functions = {
            init() {
                if (!ELEMENTS.classSelect || !ELEMENTS.nameSelect || !ELEMENTS.nextBtn) { alert("嚴重錯誤：無法找到登入界面的核心元素！遊戲無法啟動。"); return; }
                functions.createStars();
                functions.populateClassSelect();
                functions.updateNameSelect();
                functions.showScreen('start');
                functions.bindEvents();
            },
            
            bindEvents() {
                ELEMENTS.classSelect.addEventListener('change', functions.updateNameSelect);
                ELEMENTS.nextBtn.addEventListener('click', () => { if (!ELEMENTS.classSelect.value || !ELEMENTS.nameSelect.value) return alert('請先選擇！'); state.currentUser = { class: ELEMENTS.classSelect.value, name: ELEMENTS.nameSelect.options[ELEMENTS.nameSelect.selectedIndex].text }; functions.showScreen('rules'); });
                ELEMENTS.startGameBtn.addEventListener('click', functions.startGame);
                ELEMENTS.playAgainBtn.addEventListener('click', () => { state.fullLeaderboard = null; functions.showScreen('start'); });
                ELEMENTS.answerButtons.forEach(btn => btn.addEventListener('click', functions.handleAnswerClick));
                ELEMENTS.skipBtn.addEventListener('click', () => { if (!state.isAnswering) functions.generateQuestion(); });
                ELEMENTS.aidBtn.addEventListener('click', functions.showVisualAid);
                ELEMENTS.aidOverlay.addEventListener('click', functions.hideVisualAid);
                ELEMENTS.viewLeaderboardBtn.addEventListener('click', async () => { functions.showScreen('leaderboard'); await functions.displayLeaderboard(ELEMENTS.leaderboardMainContainer); });
                ELEMENTS.backToStartBtn.addEventListener('click', () => { state.fullLeaderboard = null; functions.showScreen('start'); });
                ELEMENTS.backToStartFromEndBtn.addEventListener('click', () => { state.fullLeaderboard = null; functions.showScreen('start'); });
            },

            showScreen(name) { const c = document.querySelector('.screen.active'); const n = ELEMENTS.screens[name]; if (!n || c === n) return; if (c) c.classList.remove('active'); n.classList.add('active'); },
            updateScoreDisplay(type) { ELEMENTS.scoreDisplay.textContent = `⭐ x ${state.score}`; ['pulse-animation', 'wiggle-animation'].forEach(c => ELEMENTS.scoreDisplay.classList.remove(c)); void ELEMENTS.scoreDisplay.offsetWidth; if (type === 'pulse') ELEMENTS.scoreDisplay.classList.add('pulse-animation'); else if (type === 'wiggle') ELEMENTS.scoreDisplay.classList.add('wiggle-animation'); },
            handleAnswerClick(e) { if (state.isAnswering) return; state.isAnswering = true; const btn = e.target; const answer = parseInt(btn.textContent, 10); ELEMENTS.correctSound.pause(); ELEMENTS.correctSound.currentTime = 0; ELEMENTS.incorrectSound.pause(); ELEMENTS.incorrectSound.currentTime = 0; if (answer === state.currentCorrectAnswer) { state.score += state.isAidUsed ? 5 : 10; ELEMENTS.correctSound.play(); btn.classList.add('correct-flash'); functions.updateScoreDisplay('pulse'); } else { if (state.score > 0) functions.updateScoreDisplay('wiggle'); state.score -= 5; if (state.score < 0) state.score = 0; ELEMENTS.incorrectSound.play(); btn.classList.add('incorrect-shake'); ELEMENTS.answerButtons.forEach(button => { if (parseInt(button.textContent, 10) === state.currentCorrectAnswer) button.classList.add('highlight-correct'); }); } setTimeout(() => { ELEMENTS.scoreDisplay.textContent = `⭐ x ${state.score}`; functions.generateQuestion(); ELEMENTS.answerButtons.forEach(button => button.classList.remove('correct-flash', 'incorrect-shake', 'highlight-correct')); state.isAnswering = false; }, 800); },
            startGame() { state.fullLeaderboard = null; Object.assign(state, { timeLeft: 60, score: 0, isAnswering: false, isAidUsed: false }); functions.updateScoreDisplay(); ELEMENTS.timerDisplay.textContent = `時間：${state.timeLeft}`; ELEMENTS.timerDisplay.classList.remove('timer-warning'); functions.showScreen('game'); functions.generateQuestion(); state.timerId = setInterval(() => { state.timeLeft--; ELEMENTS.timerDisplay.textContent = `時間：${state.timeLeft}`; if (state.timeLeft <= 10) ELEMENTS.timerDisplay.classList.add('timer-warning'); if (state.timeLeft <= 0) functions.endGame(); }, 1000); },
            async endGame() { clearInterval(state.timerId); ELEMENTS.timerDisplay.classList.remove('timer-warning'); functions.showScreen('end'); const fullName = `${state.currentUser.class} ${state.currentUser.name}`; ELEMENTS.finalScoreText.textContent = `${fullName}，你獲得了 ${state.score} 顆星星！`; ELEMENTS.leaderboardContainer.innerHTML = '<h2>排行榜</h2><p>載入中...</p>'; if (state.score > 0) { ELEMENTS.rankInfoText.textContent = "正在儲存分數，並同步最新排名..."; await functions.saveToLeaderboard(state.currentUser.class, state.currentUser.name, state.score); let rank = -1; let attempts = 0; while (rank === -1 && attempts < 5) { await new Promise(resolve => setTimeout(resolve, 1200)); state.fullLeaderboard = null; rank = await functions.getPlayerRank(state.currentUser.class, state.currentUser.name); attempts++; } let rankMessage = ""; if (rank > 0) { rankMessage = (rank === 1) ? "太棒了！你打破了最高紀錄，榮登榜首！👑" : `恭喜！你目前的排名是：第 ${rank} 名 🎉`; if (rank > 10) { rankMessage = `你的準確排名是：第 ${rank} 名。繼續加油！`; } } else { rankMessage = "分數已儲存，但排名更新可能稍有延遲，請稍後查看。"; } ELEMENTS.rankInfoText.textContent = rankMessage; } else { ELEMENTS.rankInfoText.textContent = "這次沒有分數，下次再努力！"; } await functions.displayLeaderboard(ELEMENTS.leaderboardContainer, state.currentUser.class, state.currentUser.name); },
            calculateRanks(board) { if (!board || board.length === 0) return []; let rank = 1; return board.map((p, i) => { if (i > 0 && p.score < board[i - 1].score) { rank = i + 1; } return { ...p, rank: rank }; }); },
            async getFullLeaderboard() { if (state.fullLeaderboard) return state.fullLeaderboard; try { const url = new URL(SCRIPT_URL); url.searchParams.set('t', new Date().getTime()); const response = await fetch(url); if (!response.ok) throw new Error('Network response was not ok.'); const data = await response.json(); if (data.success) { state.fullLeaderboard = data.leaderboard; return data.leaderboard; } return []; } catch (error) { console.error("獲取排行榜時發生網絡錯誤:", error); return []; } },
            async saveToLeaderboard(playerClass, playerName, playerScore) { try { const url = new URL(SCRIPT_URL); url.searchParams.set('action', 'write'); url.searchParams.set('class', playerClass); url.searchParams.set('name', playerName); url.searchParams.set('score', playerScore); fetch(url); } catch (error) { console.error("儲存分數時發生網絡錯誤:", error); alert('無法連接到伺服器，你的分數可能未能成功儲存。'); } },
            async getPlayerRank(playerClass, playerName) { const board = await functions.getFullLeaderboard(); const rankedBoard = functions.calculateRanks(board); const player = rankedBoard.find(p => p.class === playerClass && p.name === playerName); return player ? player.rank : -1; },
            async displayLeaderboard(container, currentPlayerClass = null, currentPlayerName = null) { container.innerHTML = '<h2>排行榜</h2><p>載入中...</p>'; const board = await functions.getFullLeaderboard(); const rankedBoard = functions.calculateRanks(board); const topEntries = rankedBoard.slice(0, 10); if (topEntries.length === 0) { container.innerHTML = '<h2>排行榜</h2><p>還沒有人上榜！</p>'; return; } container.innerHTML = '<h2>排行榜</h2>'; const list = document.createElement('ol'); list.className = 'leaderboard-list'; topEntries.forEach(p => { const item = document.createElement('li'); item.className = 'leaderboard-item'; if (p.class === currentPlayerClass && p.name === currentPlayerName) { item.classList.add('current-player'); } const nameSpan = document.createElement('span'); nameSpan.textContent = `${p.rank}. ${p.class} ${p.name}`; const scoreSpan = document.createElement('span'); scoreSpan.textContent = `⭐ ${p.score}`; item.appendChild(nameSpan); item.appendChild(scoreSpan); list.appendChild(item); }); container.appendChild(list); },
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
