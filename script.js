// --- 乘法星星榜 V2.0 (Google Sheets 雲端版) ---
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. 立即執行的主函數，這是程式的唯一入口。
    function main() {
        // 2. 獲取所有需要的 HTML 元素。
        const ELEMENTS = {
            screens: { start: document.getElementById('start-screen'), rules: document.getElementById('rules-screen'), game: document.getElementById('game-screen'), end: document.getElementById('end-screen'), leaderboard: document.getElementById('leaderboard-screen') },
            classSelect: document.getElementById('class-select'),
            nameSelect: document.getElementById('name-select'),
            nextBtn: document.getElementById('next-btn'),
            startGameBtn: document.getElementById('start-game-btn'),
            playAgainBtn: document.getElementById('play-again-btn'),
            skipBtn: document.getElementById('skip-btn'),
            answerButtons: document.querySelectorAll('.btn-answer'),
            timerDisplay: document.getElementById('timer'),
            scoreDisplay: document.getElementById('score'),
            questionArea: document.getElementById('question-area'),
            finalScoreText: document.getElementById('final-score-text'),
            rankInfoText: document.getElementById('rank-info-text'),
            aidBtn: document.getElementById('aid-btn'),
            aidOverlay: document.getElementById('aid-overlay'),
            aidContent: document.getElementById('aid-content'),
            correctSound: document.getElementById('correct-sound'),
            incorrectSound: document.getElementById('incorrect-sound'),
            leaderboardContainer: document.getElementById('leaderboard'),
            leaderboardMainContainer: document.getElementById('leaderboard-main'),
            viewLeaderboardBtn: document.getElementById('view-leaderboard-btn'),
            backToStartBtn: document.getElementById('back-to-start-btn'),
            stars: { small: document.getElementById('stars-small'), medium: document.getElementById('stars-medium'), large: document.getElementById('stars-large') }
        };

        // 3. 定義遊戲的數據和狀態。
        let state = { timerId: null, timeLeft: 60, score: 0, currentUser: {}, currentCorrectAnswer: 0, currentQuestionNums: {}, isAnswering: false, isAidUsed: false };
        
        // 【V2.0 修改】使用 Google Apps Script 網址，移除舊的 STORAGE_KEY
        const CONSTANTS = { 
            WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbztsPLMMijrXrQ_rD9ohrs8aLkVxtrcLTSKSSziyar5FKOLh2laz_AYWWS6O6So3Ujw/exec',
            classes: { '2A': 25, '2B': 25, '2C': 25, '2D': 25, '2E': 25, '老師': ["陳子殷老師", "陳綺雯老師", "陳懿文老師", "楊靖霖老師", "陳慧淇老師"] } 
        };

        // 4. 定義所有遊戲功能函數。
        const functions = {
            init() {
                if (!ELEMENTS.classSelect || !ELEMENTS.nameSelect || !ELEMENTS.nextBtn) {
                    alert("嚴重錯誤：無法找到登入界面的核心元素！遊戲無法啟動。");
                    return;
                }
                functions.createStars();
                functions.populateClassSelect();
                functions.updateNameSelect();
                functions.showScreen('start', 'instant');
                functions.bindEvents();
            },
            bindEvents() {
                ELEMENTS.classSelect.addEventListener('change', functions.updateNameSelect);
                ELEMENTS.nextBtn.addEventListener('click', () => {
                    if (!ELEMENTS.classSelect.value || !ELEMENTS.nameSelect.value) return alert('請先選擇！');
                    const selectedClass = ELEMENTS.classSelect.value;
                    const selectedName = ELEMENTS.nameSelect.options[ELEMENTS.nameSelect.selectedIndex].text;
                    const fullName = (selectedClass === '老師') ? selectedName : `${selectedClass} ${selectedName}`;
                    state.currentUser = { class: selectedClass, name: fullName };
                    functions.showScreen('rules');
                });
                ELEMENTS.startGameBtn.addEventListener('click', functions.startGame);
                ELEMENTS.playAgainBtn.addEventListener('click', () => functions.showScreen('start'));
                ELEMENTS.answerButtons.forEach(btn => btn.addEventListener('click', functions.handleAnswerClick));
                ELEMENTS.skipBtn.addEventListener('click', () => { if (!state.isAnswering) functions.generateQuestion(); });
                ELEMENTS.aidBtn.addEventListener('click', functions.showVisualAid);
                ELEMENTS.aidOverlay.addEventListener('click', functions.hideVisualAid);
                
                // 【V2.0 修改】查看排行榜按鈕改為異步操作
                ELEMENTS.viewLeaderboardBtn.addEventListener('click', async () => {
                    ELEMENTS.leaderboardMainContainer.innerHTML = '<h2>排行榜</h2><p>正在從雲端載入...</p>';
                    functions.showScreen('leaderboard');
                    await functions.displayLeaderboard(ELEMENTS.leaderboardMainContainer);
                });

                ELEMENTS.backToStartBtn.addEventListener('click', () => functions.showScreen('start'));
            },
            showScreen(name, mode) {
                const c = document.querySelector('.screen.active');
                const n = ELEMENTS.screens[name];
                if (!n || c === n) return;
                
                if (c && mode !== 'instant') {
                    c.classList.remove('active');
                    setTimeout(() => { if (c) c.style.display = 'none'; }, 400);
                } else if (c) {
                    c.classList.remove('active');
                    c.style.display = 'none';
                }
                
                n.style.display = 'flex';
                setTimeout(() => { n.classList.add('active'); }, 10);
            },
            updateScoreDisplay(type) { 
                ELEMENTS.scoreDisplay.textContent = `⭐ x ${state.score}`; 
                ['pulse-animation', 'wiggle-animation'].forEach(c => ELEMENTS.scoreDisplay.classList.remove(c)); 
                void ELEMENTS.scoreDisplay.offsetWidth; 
                if (type === 'pulse') ELEMENTS.scoreDisplay.classList.add('pulse-animation'); 
                else if (type === 'wiggle') ELEMENTS.scoreDisplay.classList.add('wiggle-animation'); 
            },
            handleAnswerClick(e) { 
                if (state.isAnswering) return; 
                state.isAnswering = true; 
                const btn = e.target; 
                const answer = parseInt(btn.textContent, 10); 
                ELEMENTS.correctSound.pause(); 
                ELEMENTS.correctSound.currentTime = 0; 
                ELEMENTS.incorrectSound.pause(); 
                ELEMENTS.incorrectSound.currentTime = 0; 
                if (answer === state.currentCorrectAnswer) { 
                    state.score += state.isAidUsed ? 5 : 10; 
                    ELEMENTS.correctSound.play(); 
                    btn.classList.add('correct-flash'); 
                    functions.updateScoreDisplay('pulse'); 
                } else { 
                    state.score -= 5; 
                    if (state.score < 0) state.score = 0;
                    if (state.score > 0) functions.updateScoreDisplay('wiggle');
                    ELEMENTS.incorrectSound.play(); 
                    btn.classList.add('incorrect-shake'); 
                    ELEMENTS.answerButtons.forEach(button => { 
                        if (parseInt(button.textContent, 10) === state.currentCorrectAnswer) button.classList.add('highlight-correct'); 
                    }); 
                } 
                setTimeout(() => { 
                    ELEMENTS.scoreDisplay.textContent = `⭐ x ${state.score}`; 
                    functions.generateQuestion(); 
                    ELEMENTS.answerButtons.forEach(button => button.classList.remove('correct-flash', 'incorrect-shake', 'highlight-correct'));
                    state.isAnswering = false; 
                }, 800); 
            },
            startGame() { 
                Object.assign(state, { timeLeft: 60, score: 0, isAnswering: false, isAidUsed: false }); 
                functions.updateScoreDisplay(); 
                ELEMENTS.timerDisplay.textContent = `時間：${state.timeLeft}`; 
                ELEMENTS.timerDisplay.classList.remove('timer-warning'); 
                functions.showScreen('game'); 
                functions.generateQuestion(); 
                state.timerId = setInterval(() => { 
                    state.timeLeft--; 
                    ELEMENTS.timerDisplay.textContent = `時間：${state.timeLeft}`; 
                    if (state.timeLeft <= 10) ELEMENTS.timerDisplay.classList.add('timer-warning'); 
                    if (state.timeLeft <= 0) functions.endGame(); 
                }, 1000); 
            },
            // 【V2.0 修改】結束遊戲流程改為異步，以處理網路請求
            async endGame() {
                clearInterval(state.timerId);
                ELEMENTS.timerDisplay.classList.remove('timer-warning');
                ELEMENTS.finalScoreText.textContent = `${state.currentUser.name}，你獲得了 ${state.score} 顆星星！`;
                ELEMENTS.rankInfoText.textContent = '正在儲存分數並擷取最新排名...';
                ELEMENTS.leaderboardContainer.innerHTML = '<p>載入中...</p>';
                functions.showScreen('end');
                
                if (state.score > 0) {
                    await functions.saveToLeaderboard(state.currentUser.name, state.score);
                }
                
                const rank = await functions.getPlayerRank(state.currentUser.name);
                let rankMessage = "";
                if (rank > 0 && rank <= 10) {
                    rankMessage = (rank === 1) ? "太棒了！你打破了最高紀錄，榮登榜首！👑" : `恭喜！你目前的排名是：第 ${rank} 名 🎉`;
                } else if (state.score > 0) {
                    rankMessage = `你的準確排名是：第 ${rank} 名。加油！`;
                } else {
                    rankMessage = `這次沒有分數，再接再厲！`;
                }
                ELEMENTS.rankInfoText.textContent = rankMessage;
                await functions.displayLeaderboard(ELEMENTS.leaderboardContainer, state.currentUser.name);
            },
            // 【V2.0 修改】從雲端獲取完整排行榜
            async getFullLeaderboard() {
                try {
                    const response = await fetch(CONSTANTS.WEB_APP_URL);
                    if (!response.ok) throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
                    const result = await response.json();
                    if (result.status === 'success') {
                        // 後端回傳的資料鍵值是 PlayerName 和 Score，這裡轉換成舊的 name 和 score 格式
                        return result.data.map(p => ({ name: p.PlayerName, score: p.Score }));
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    console.error("無法從雲端獲取排行榜:", error);
                    alert("無法連接到雲端排行榜，請檢查網絡或聯絡管理員。");
                    return []; // 返回空陣列以避免遊戲崩潰
                }
            },
            // 【V2.0 修改】獲取玩家排名
            async getPlayerRank(playerName) {
                const board = await functions.getFullLeaderboard();
                const playerIndex = board.findIndex(p => p.name === playerName);
                return playerIndex !== -1 ? playerIndex + 1 : -1;
            },
            // 【V2.0 修改】儲存分數到雲端
            async saveToLeaderboard(playerName, playerScore) {
                try {
                    await fetch(CONSTANTS.WEB_APP_URL, {
                        method: 'POST',
                        mode: 'no-cors', // POST 請求需要設定 no-cors
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: playerName, score: playerScore })
                    });
                } catch (error) {
                    console.error("無法儲存分數到雲端:", error);
                    alert("儲存分數失敗，請檢查網絡或聯絡管理員。");
                }
            },
            // 【V2.0 修改】顯示雲端排行榜
            async displayLeaderboard(container, currentPlayerName = null) {
                container.innerHTML = '<h2>排行榜</h2>';
                const board = await functions.getFullLeaderboard();
                
                if (board.length === 0) {
                    container.innerHTML += '<p>還沒有人上榜！</p>';
                    return;
                }
                const top10 = board.slice(0, 10);
                const list = document.createElement('ol');
                list.className = 'leaderboard-list';
                top10.forEach((p, i) => {
                    const item = document.createElement('li');
                    item.className = 'leaderboard-item';
                    if (p.name === currentPlayerName) item.classList.add('current-player');
                    const nS = document.createElement('span');
                    nS.textContent = `${i + 1}. ${p.name}`;
                    const sS = document.createElement('span');
                    sS.textContent = `⭐ ${p.score}`;
                    item.appendChild(nS);
                    item.appendChild(sS);
                    list.appendChild(item);
                });
                container.appendChild(list);
            },
            generateQuestion() {
                state.isAidUsed = false;
                const n1 = Math.floor(Math.random() * 11), n2 = Math.floor(Math.random() * 11);
                state.currentQuestionNums = { n1, n2 };
                state.currentCorrectAnswer = n1 * n2;
                ELEMENTS.questionArea.textContent = `${n1} x ${n2} = ?`;
                let answers = [state.currentCorrectAnswer];
                while (answers.length < 4) {
                    const w = Math.floor(Math.random() * 101);
                    if (!answers.includes(w)) answers.push(w);
                }
                for (let i = answers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [answers[i], answers[j]] = [answers[j], answers[i]];
                }
                ELEMENTS.answerButtons.forEach((btn, i) => btn.textContent = answers[i]);
            },
            showVisualAid() { 
                if (state.isAnswering) return; 
                state.isAidUsed = true; 
                state.isAnswering = true; 
                ELEMENTS.aidContent.innerHTML = ''; 
                const r = Math.min(state.currentQuestionNums.n1, state.currentQuestionNums.n2), 
                      c = Math.max(state.currentQuestionNums.n1, state.currentQuestionNums.n2); 
                for (let i = 0; i < r; i++) { 
                    const row = document.createElement('div'); 
                    row.className = 'aid-row'; 
                    for (let j = 0; j < c; j++) { 
                        const obj = document.createElement('span'); 
                        obj.className = 'aid-object'; 
                        obj.textContent = '⭐'; 
                        row.appendChild(obj); 
                    } 
                    ELEMENTS.aidContent.appendChild(row); 
                } 
                ELEMENTS.aidOverlay.classList.add('active'); 
            },
            hideVisualAid() { 
                ELEMENTS.aidOverlay.classList.remove('active'); 
                state.isAnswering = false; 
            },
            populateClassSelect() { 
                ELEMENTS.classSelect.innerHTML = ''; 
                Object.keys(CONSTANTS.classes).forEach(n => { 
                    const o = document.createElement('option'); 
                    o.value = n; 
                    o.textContent = n; 
                    ELEMENTS.classSelect.appendChild(o); 
                }); 
            },
            updateNameSelect() { 
                const c = ELEMENTS.classSelect.value; 
                ELEMENTS.nameSelect.innerHTML = ''; 
                if (c === '老師') {
                    CONSTANTS.classes[c].forEach(n => { 
                        const o = document.createElement('option'); 
                        o.value = n; 
                        o.textContent = n; 
                        ELEMENTS.nameSelect.appendChild(o); 
                    });
                } else {
                    for (let i = 1; i <= CONSTANTS.classes[c]; i++) { 
                        const o = document.createElement('option'); 
                        o.value = i; 
                        o.textContent = `${i}號`; 
                        ELEMENTS.nameSelect.appendChild(o); 
                    }
                }
            },
            createStars() { 
                const create = (count) => Array.from({ length: count }, () => `${Math.random() * 2000}px ${Math.random() * 2000}px #FFF`).join(','); 
                if (ELEMENTS.stars.small) ELEMENTS.stars.small.style.boxShadow = create(700); 
                if (ELEMENTS.stars.medium) ELEMENTS.stars.medium.style.boxShadow = create(200); 
                if (ELEMENTS.stars.large) ELEMENTS.stars.large.style.boxShadow = create(100); 
            }
        };

        // 5. 啟動
        functions.init();
    }
    main();
});
