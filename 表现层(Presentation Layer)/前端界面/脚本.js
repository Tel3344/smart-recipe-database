// 全局变量
let currentMenu = null;

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化事件监听
    initEventListeners();
    
    // 设置当前季节
    setCurrentSeason();
});

// 初始化事件监听
function initEventListeners() {
    // 用餐人数滑块
    const peopleSlider = document.getElementById('people');
    const peopleValue = document.getElementById('people-value');
    
    peopleSlider.addEventListener('input', function() {
        peopleValue.textContent = this.value + '人';
    });
    
    // 标签选择
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const parent = this.parentElement;
            if (this.dataset.value === '无限制') {
                // 取消选择其他标签
                parent.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            } else {
                // 移除"无限制"标签的选中状态
                const noneTag = parent.querySelector('[data-value="无限制"]');
                if (noneTag) noneTag.classList.remove('active');
                this.classList.toggle('active');
            }
        });
    });
    
    // 生成按钮
    document.getElementById('generate-btn').addEventListener('click', generateMenu);
    
    // 导出按钮
    document.getElementById('export-pdf').addEventListener('click', exportPDF);
    document.getElementById('export-list').addEventListener('click', generateShoppingList);
}

// 设置当前季节
function setCurrentSeason() {
    const month = new Date().getMonth() + 1;
    let season = '春季';
    
    if (month >= 3 && month <= 5) season = '春季';
    else if (month >= 6 && month <= 8) season = '夏季';
    else if (month >= 9 && month <= 11) season = '秋季';
    else season = '冬季';
    
    const seasonSelect = document.getElementById('season');
    seasonSelect.value = season;
}

// 生成菜单
async function generateMenu() {
    // 显示加载状态
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    loading.style.display = 'block';
    results.style.display = 'none';
    
    // 收集参数
    const params = {
        people: document.getElementById('people').value,
        season: document.getElementById('season').value === 'auto' ? getCurrentSeason() : document.getElementById('season').value,
        taste: Array.from(document.querySelectorAll('#taste-tags .tag.active'))
            .map(tag => tag.dataset.value)
            .filter(v => v !== '无限制')
    };
    
    try {
        // 构建API URL
        const apiUrl = new URL('https://your-worker.your-account.workers.dev/api/recommend');
        Object.keys(params).forEach(key => {
            if (params[key] && params[key].length > 0) {
                if (Array.isArray(params[key])) {
                    apiUrl.searchParams.set(key, params[key].join(','));
                } else {
                    apiUrl.searchParams.set(key, params[key]);
                }
            }
        });
        
        // 调用API
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('API请求失败');
        }
        
        currentMenu = await response.json();
        
        // 渲染菜单
        renderMenu(currentMenu);
        
        // 显示结果
        loading.style.display = 'none';
        results.style.display = 'block';
        
    } catch (error) {
        console.error('生成菜单失败:', error);
        loading.innerHTML = '<p style="color: red;">生成菜单失败，请稍后重试</p>';
    }
}

// 获取当前季节（用于自动检测）
function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '春季';
    if (month >= 6 && month <= 8) return '夏季';
    if (month >= 9 && month <= 11) return '秋季';
    return '冬季';
}

// 渲染菜单
function renderMenu(menu) {
    const menuGrid = document.getElementById('menu-grid');
    menuGrid.innerHTML = '';
    
    // 渲染每个类别的菜谱
    Object.keys(menu).forEach(category => {
        menu[category].forEach(recipe => {
            const card = createRecipeCard(recipe, category);
            menuGrid.appendChild(card);
        });
    });
}

// 创建菜谱卡片
function createRecipeCard(recipe, category) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // 使用类别决定图标
    const icons = {
        '主菜': '🥘',
        '配菜': '🥗',
        '汤品': '🍲',
        '主食': '🍚'
    };
    
    const icon = icons[category] || '🍽️';
    
    card.innerHTML = `
        <div class="recipe-image">
            <span>${icon}</span>
        </div>
        <div class="recipe-content">
            <h4 class="recipe-title">${recipe.菜品名称}</h4>
            <div class="recipe-meta">
                <span>${category}</span>
                <span>${recipe.准备时间 + recipe.烹饪时间}分钟</span>
            </div>
            <p>${recipe.菜品描述 || ''}</p>
            <div class="recipe-tags">
                ${recipe.菜品标签 ? recipe.菜品标签.slice(0, 3).map(tag => 
                    `<span class="recipe-tag">${tag}</span>`
                ).join('') : ''}
            </div>
            ${recipe.调整后食材 ? `
                <div class="ingredients" style="margin-top: 1rem; font-size: 0.9rem;">
                    <strong>食材:</strong>
                    <ul style="margin-top: 0.5rem; padding-left: 1rem;">
                        ${recipe.调整后食材.slice(0, 3).map(ing => 
                            `<li>${ing.食材名称}: ${ing.调整用量}${ing.单位}</li>`
                        ).join('')}
                        ${recipe.调整后食材.length > 3 ? '<li>...</li>' : ''}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

// 导出PDF（示例）
function exportPDF() {
    if (!currentMenu) {
        alert('请先生成菜单');
        return;
    }
    
    alert('PDF导出功能开发中...');
    // 实际可以使用jsPDF库
}

// 生成购物清单
function generateShoppingList() {
    if (!currentMenu) {
        alert('请先生成菜单');
        return;
    }
    
    // 合并所有食材
    const allIngredients = {};
    
    Object.values(currentMenu).forEach(recipes => {
        recipes.forEach(recipe => {
            if (recipe.调整后食材) {
                recipe.调整后食材.forEach(ing => {
                    const key = ing.食材名称;
                    if (!allIngredients[key]) {
                        allIngredients[key] = {
                            用量: 0,
                            单位: ing.单位
                        };
                    }
                    allIngredients[key].用量 += ing.调整用量;
                });
            }
        });
    });
    
    // 生成清单文本
    let listText = '购物清单\n\n';
    Object.keys(allIngredients).forEach(name => {
        const ing = allIngredients[name];
        listText += `${name}: ${ing.用量}${ing.单位}\n`;
    });
    
    // 创建下载
    const blob = new Blob([listText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '购物清单.txt';
    a.click();
    URL.revokeObjectURL(url);
}
