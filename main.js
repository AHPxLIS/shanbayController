// ==UserScript==
// @name         扇贝单词手柄快捷键+深色模式
// @namespace    null
// @version      0.5
// @description  为扇贝单词网页添加深色模式支持以及手柄快捷键，可自定义按键映射
// @author       AhpGFlis
// @match        https://web.shanbay.com/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 使用滤镜组合实现自然颜色反转
    const css = `
        html {
            background-color: #FFF !important; /* 基础背景设为白色，反转后变黑 */
            filter: invert(1) hue-rotate(180deg) !important;
            min-height: 100vh;
        }

        /* 排除不需要反转的元素 */
        img,
        video,
        iframe,
        [class*="image"],
        [class*="icon"],
        [class*="logo"] {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* 专门处理输入框的placeholder */
        .input::placeholder {
            color: #000 !important;
            opacity: 0.7 !important;
        }

        /* 自定义配置窗口样式 */
        .gamepad-config-window {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
            z-index: 9999;
            color: #000;
            max-width: 500px;
            width: 90%;
        }

        .gamepad-config-window h3 {
            margin-top: 0;
            color: #333;
        }

        .gamepad-config-window label {
            display: block;
            margin: 10px 0;
        }

        .gamepad-config-window select,
        .gamepad-config-window input {
            margin-left: 10px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .gamepad-config-buttons {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
        }

        .gamepad-config-buttons button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .gamepad-config-buttons .save-btn {
            background-color: #4CAF50;
            color: white;
        }

        .gamepad-config-buttons .close-btn {
            background-color: #f44336;
            color: white;
        }

        .gamepad-config-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.5);
            z-index: 9998;
        }
    `;

    // 尽早注入样式
    GM_addStyle(css);

    // 监听DOM加载完成，处理动态内容
    window.addEventListener('DOMContentLoaded', () => {
        // 添加过渡效果避免闪屏
        document.documentElement.style.transition = 'filter 0.3s ease';

        // 处理可能存在的内联样式冲突
        document.querySelectorAll('[style*="background"]').forEach(el => {
            el.style.setProperty('background-color', 'transparent', 'important');
        });
    });
    console.log("扇贝单词深色模式脚本已加载");

   // 默认手柄按键映射配置
    const DEFAULT_KEY_MAPPING = {
        0: "2",   // A按钮 - 提示一下/没想起来
        1: "1",   // B按钮 - 认识/想起来了
        2: "p",   // X按钮 - 单词发音
        3: "v",   // Y按钮 - 例句发音
        4: "9",   // LB - 太简单
        5: "d",   // RB - 下个单词
        12: "1",  // 上方向键 - 选项1
        13: "4",  // 下方向键 - 选项4
        14: "2",  // 左方向键 - 选项2
        15: "3"   // 右方向键 - 选项3
    };

    // 扇贝官方快捷键说明
    const SHANBAY_SHORTCUTS = [
        { desc: "认识、想起来了", key: "1" },
        { desc: "提示一下、没想起来、撤销", key: "2" },
        { desc: "选择对应选项3", key: "3" },
        { desc: "选择对应选项4", key: "4" },
        { desc: "太简单", key: "9" },
        { desc: "下个单词", key: "d" },
        { desc: "单词发音", key: "p" },
        { desc: "例句发音", key: "v" },
        { desc: "关闭对话框", key: "Escape" }
    ];

    // 手柄按钮标签
    const GAMEPAD_BUTTON_LABELS = {
        0: "A 按钮 (PS ✖)",
        1: "B 按钮 (PS ○)",
        2: "X 按钮 (PS □)",
        3: "Y 按钮 (PS △)",
        4: "LB (L1)",
        5: "RB (R1)",
        6: "LT (L2)",
        7: "RT (R2)",
        8: "Back/Share",
        9: "Start/Options",
        12: "十字键 上",
        13: "十字键 下",
        14: "十字键 左",
        15: "十字键 右"
    };

    // 添加样式
    GM_addStyle(`
        /* 浮动按钮样式 */
        .gamepad-float-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background-color: #4CAF50;
            color: white;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            user-select: none;
        }

        /* 配置窗口样式 */
        .gamepad-config-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
            z-index: 10000;
            color: #333;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .gamepad-config-title {
            margin-top: 0;
            text-align: center;
            color: #2c3e50;
        }

        .gamepad-config-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }

        .gamepad-config-table th,
        .gamepad-config-table td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }

        .gamepad-config-table th {
            background-color: #f2f2f2;
        }

        .gamepad-button-cell {
            cursor: pointer;
            min-width: 120px;
            text-align: center !important;
        }

        .gamepad-button-cell:hover {
            background-color: #f0f8ff;
        }

        .gamepad-button-cell.waiting {
            background-color: #fffacd;
            font-weight: bold;
        }

        .gamepad-config-buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }

        .gamepad-config-btn {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .gamepad-save-btn {
            background-color: #4CAF50;
            color: white;
        }

        .gamepad-reset-btn {
            background-color: #f39c12;
            color: white;
        }

        .gamepad-close-btn {
            background-color: #e74c3c;
            color: white;
        }

        .gamepad-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.5);
            z-index: 9999;
        }

        .gamepad-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #e74c3c;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `);

    /*
     ###手柄部分###
    */

    // 获取或初始化按键映射
    function getKeyMapping() {
        const savedMapping = GM_getValue('keyMapping');
        return savedMapping ? JSON.parse(savedMapping) : {...DEFAULT_KEY_MAPPING};
    }

    // 存储当前连接的手柄
    let gamepad = null;
    let buttonStates = [];
    let isListeningForButton = false;
    let currentListeningCell = null;

    // 初始化手柄检测
    function initGamepad() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("手柄已连接:", e.gamepad.id);
            gamepad = e.gamepad;
            buttonStates = new Array(gamepad.buttons.length).fill(false);
            startListening();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("手柄已断开");
            gamepad = null;
        });
    }

    // 开始监听手柄输入
    function startListening() {
        function checkGamepad() {
            if (!gamepad) return;

            const currentGamepad = navigator.getGamepads()[gamepad.index];
            if (!currentGamepad) return;

            // 检查按键监听模式
            if (isListeningForButton) {
                currentGamepad.buttons.forEach((button, index) => {
                    if (button.pressed && !buttonStates[index]) {
                        handleButtonPressedWhileListening(index);
                    }
                });
            } else {
                // 正常按键功能模式
                currentGamepad.buttons.forEach((button, index) => {
                    const pressed = button.pressed;
                    if (pressed && buttonStates[index] !== pressed) {
                        const keyMapping = getKeyMapping();
                        const keyboardKey = keyMapping[index];
                        if (keyboardKey) {
                            simulateKeyPress(keyboardKey);
                        }
                    }
                    buttonStates[index] = pressed;
                });
            }

            buttonStates = currentGamepad.buttons.map(btn => btn.pressed);
            requestAnimationFrame(checkGamepad);
        }

        requestAnimationFrame(checkGamepad);
    }

    // 模拟键盘按键
    function simulateKeyPress(key) {
        const keyEvent = new KeyboardEvent("keydown", {
            key: key,
            code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
            bubbles: true,
            cancelable: true
        });
        document.activeElement.dispatchEvent(keyEvent);
    }

    // 创建浮动按钮
    function createFloatingButton() {
        const floatBtn = document.createElement('div');
        floatBtn.className = 'gamepad-float-btn';
        floatBtn.textContent = '🎮';
        floatBtn.title = '配置手柄按键映射';
        floatBtn.addEventListener('click', createConfigWindow);
        document.body.appendChild(floatBtn);
    }

    // 创建配置窗口
    function createConfigWindow() {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'gamepad-overlay';

        // 创建配置窗口容器
        const container = document.createElement('div');
        container.className = 'gamepad-config-container';

        // 添加标题
        const title = document.createElement('h2');
        title.className = 'gamepad-config-title';
        title.textContent = '手柄按键映射配置';
        container.appendChild(title);

        // 创建配置表格
        const table = document.createElement('table');
        table.className = 'gamepad-config-table';

        // 添加表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const header1 = document.createElement('th');
        header1.textContent = '功能说明';
        const header2 = document.createElement('th');
        header2.textContent = '键盘快捷键';
        const header3 = document.createElement('th');
        header3.textContent = '手柄按键映射';

        headerRow.appendChild(header1);
        headerRow.appendChild(header2);
        headerRow.appendChild(header3);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 添加表格内容
        const tbody = document.createElement('tbody');
        const currentMapping = getKeyMapping();

        // 获取反向映射（手柄按钮到功能）
        const reverseMapping = {};
        Object.keys(currentMapping).forEach(btnIndex => {
            const key = currentMapping[btnIndex];
            reverseMapping[key] = reverseMapping[key] || [];
            reverseMapping[key].push(btnIndex);
        });

        SHANBAY_SHORTCUTS.forEach(shortcut => {
            const row = document.createElement('tr');

            // 功能说明列
            const descCell = document.createElement('td');
            descCell.textContent = shortcut.desc;
            row.appendChild(descCell);

            // 键盘快捷键列
            const keyCell = document.createElement('td');
            keyCell.textContent = shortcut.key;
            row.appendChild(keyCell);

            // 手柄按键映射列
            const btnCell = document.createElement('td');
            btnCell.className = 'gamepad-button-cell';

            // 显示当前映射的手柄按钮
            const mappedButtons = reverseMapping[shortcut.key] || [];
            if (mappedButtons.length > 0) {
                btnCell.textContent = mappedButtons.map(btnIndex =>
                    GAMEPAD_BUTTON_LABELS[btnIndex]
                ).join(', ');
            } else {
                btnCell.textContent = '点击设置';
            }

            // 添加点击事件监听
            btnCell.addEventListener('click', function() {
                if (!isListeningForButton) {
                    startListeningForButton(this, shortcut.key);
                }
            });

            row.appendChild(btnCell);
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        // 添加操作按钮
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'gamepad-config-buttons';

        // 保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.className = 'gamepad-config-btn gamepad-save-btn';
        saveBtn.textContent = '保存配置';
        saveBtn.addEventListener('click', saveConfig);
        buttonsDiv.appendChild(saveBtn);

        // 重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.className = 'gamepad-config-btn gamepad-reset-btn';
        resetBtn.textContent = '恢复默认';
        resetBtn.addEventListener('click', resetConfig);
        buttonsDiv.appendChild(resetBtn);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'gamepad-config-btn gamepad-close-btn';
        closeBtn.textContent = '关闭';
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(overlay);
            document.body.removeChild(container);
        });
        buttonsDiv.appendChild(closeBtn);

        container.appendChild(buttonsDiv);

        // 添加到文档
        document.body.appendChild(overlay);
        document.body.appendChild(container);

        // 保存配置函数
        function saveConfig() {
            const newMapping = {};
            let hasMapping = false;

            // 收集所有配置
            tbody.querySelectorAll('tr').forEach(row => {
                const key = row.querySelector('td:nth-child(2)').textContent;
                const btnCell = row.querySelector('td:nth-child(3)');
                const btnText = btnCell.textContent;

                if (btnText !== '点击设置') {
                    Object.keys(GAMEPAD_BUTTON_LABELS).forEach(btnIndex => {
                        if (btnText.includes(GAMEPAD_BUTTON_LABELS[btnIndex])) {
                            newMapping[btnIndex] = key;
                            hasMapping = true;
                        }
                    });
                }
            });

            if (hasMapping) {
                GM_setValue('keyMapping', JSON.stringify(newMapping));
                showNotification('配置已保存！');
            } else {
                showNotification('请至少设置一个手柄按键映射！');
            }
        }

        // 重置配置函数
        function resetConfig() {
            GM_setValue('keyMapping', JSON.stringify(DEFAULT_KEY_MAPPING));
            showNotification('已恢复默认配置，请重新打开配置窗口查看');
            document.body.removeChild(overlay);
            document.body.removeChild(container);
        }
    }

    // 开始监听手柄按钮输入
    function startListeningForButton(cell, key) {
        if (!gamepad) {
            showNotification('请先连接手柄');
            return;
        }

        isListeningForButton = true;
        currentListeningCell = cell;
        cell.textContent = '请按下手柄按钮...';
        cell.classList.add('waiting');

        // 设置超时自动取消
        setTimeout(() => {
            if (isListeningForButton) {
                stopListeningForButton();
                showNotification('按键监听已超时取消');
            }
        }, 5000);
    }

    // 处理按键监听模式下的按钮按下事件
    function handleButtonPressedWhileListening(buttonIndex) {
        if (!isListeningForButton || !currentListeningCell) return;

        // 检查按钮是否有效（0-15，排除10,11,16）
        if (buttonIndex < 0 || buttonIndex > 15 || buttonIndex === 10 || buttonIndex === 11) {
            showNotification('不支持映射此按钮，请选择其他按钮');
            stopListeningForButton();
            return;
        }

        // 更新单元格显示
        currentListeningCell.textContent = GAMEPAD_BUTTON_LABELS[buttonIndex];
        currentListeningCell.classList.remove('waiting');

        // 重置监听状态
        stopListeningForButton();
    }

    // 停止监听手柄按钮
    function stopListeningForButton() {
        isListeningForButton = false;
        if (currentListeningCell) {
            currentListeningCell.classList.remove('waiting');
        }
        currentListeningCell = null;
    }

    // 显示通知
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'gamepad-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    // 初始化
    function init() {
        initGamepad();
        createFloatingButton();
        GM_registerMenuCommand('配置手柄按键映射', createConfigWindow);
        console.log("扇贝单词手柄控制脚本已加载");
    }

    // 等待DOM加载完成后初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 0);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();