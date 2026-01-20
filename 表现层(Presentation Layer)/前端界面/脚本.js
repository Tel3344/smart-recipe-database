// ============================================
// 智能菜谱推荐系统 - 前端交互逻辑
// ============================================

// 全局状态管理
const AppState = {
    // 用户设置
    settings: {
        用餐人数: 6,
        季节: '春季',
        天气: '任意',
        口味偏好: ['无限制'],
        特殊需求: [],
        难度等级: '不限',
        最大时间: 120
    },
    
    // 当前菜单
    currentMenu: null,
    
    // 购物车
    shoppingCart: [],
    
    // 用户数据
    userData: {
        favorites: new Set(),
        history: [],
        preferences: {}
    },
    
    // 菜谱数据
    recipes: [],
    categories: {},
    seasonalData: {},
    
    // UI状态
    uiState: {
        currentPage: 'home',
        isLoading: false,
        isDarkMode: false,
        modalOpen: null
    }
};

// API配置
const API_CONFIG = {
    baseURL: 'https://smart-recipe-api.你的用户名.workers.dev',
    endpoints: {
        recommend: '/api/recommend',
        recipes: '/api/recipes',
        categories: '/api/categories',
        upload: '/api/upload'
    },
    // 备用API（开发环境使用本地模拟）
    fallbackMode: false
};

// ============================================
// 工具函数
// ============================================

// 显示通知
function showNotification(title, message, type = 'info', duration = 5000) {
    const container = document.getElementById('通知容器');
    
    const notification = document.createElement('div');
    notification.className = `通知 ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)} 通知图标"></i>
        <div class="通知内容">
            <div class="通知标题">${title}</div>
            <div class="通知消息">${message}</div>
        </div>
        <button class="通知关闭" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // 自动移除
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    return notification;
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// 格式化时间
function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 深拷贝
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 存储数据到本地
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('保存数据失败:', error);
        showNotification('警告', '本地存储失败，部分功能可能受限', 'warning');
    }
}

// 从本地读取数据
function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('读取数据失败:', error);
        return defaultValue;
    }
}

// ============================================
// API通信函数
// ============================================

// API请求封装
async function apiRequest(endpoint, options = {}) {
    const url = API_CONFIG.baseURL + endpoint;
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        timeout: 10000 // 10秒超时
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    try {
        showLoading();
        const response = await Promise.race([
            fetch(url, requestOptions),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时')), requestOptions.timeout)
            )
        ]);
        
        hideLoading();
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        hideLoading();
        console.error(`API请求失败 (${endpoint}):`, error);
        
        // 如果是开发环境或API不可用，使用模拟数据
        if (API_CONFIG.fallbackMode || error.message.includes('Failed to fetch')) {
            console.log('使用模拟数据');
            return await getMockData(endpoint, options);
        }
        
        throw error;
    }
}

// 模拟数据（API不可用时使用）
async function getMockData(endpoint, options) {
    await new Promise(resolve => setTimeout(resolve, 500)); // 模拟延迟
    
    const mockData = {
        '/api/recommend': {
            成功: true,
            参数: AppState.settings,
            菜单: generateMockMenu(),
            营养信息: generateMockNutrition(),
            购物清单: generateMockShoppingList(),
            生成时间: new Date().toISOString(),
            提示: ['基于模拟数据生成的菜单']
        },
        '/api/recipes': {
            成功: true,
            数据: getMockRecipes(),
            分页: {
                页码: 1,
                每页数量: 20,
                总数量: 50,
                总页数: 3
            }
        },
        '/api/categories': {
            成功: true,
            数据: getMockCategories()
        }
    };
    
    return mockData[endpoint] || { 成功: false, 错误: '不支持的端点' };
}

// 获取推荐菜单
async function getRecommendations(params = {}) {
    const queryParams = new URLSearchParams({
        人数: params.用餐人数 || AppState.settings.用餐人数,
        季节: params.季节 || AppState.settings.季节,
        天气: params.天气 || AppState.settings.天气,
        口味: params.口味偏好 ? params.口味偏好.join(',') : AppState.settings.口味偏好.join(','),
        需求: params.特殊需求 ? params.特殊需求.join(',') : AppState.settings.特殊需求.join(','),
        时间: params.最大时间 || AppState.settings.最大时间,
        难度: params.难度等级 || AppState.settings.难度等级
    });
    
    return await apiRequest(`${API_CONFIG.endpoints.recommend}?${queryParams}`);
}

// 获取菜谱列表
async function getRecipes(filters = {}, page = 1, pageSize = 20) {
    const queryParams = new URLSearchParams({
        页码: page,
        每页数量: pageSize,
        ...filters
    });
    
    return await apiRequest(`${API_CONFIG.endpoints.recipes}?${queryParams}`);
}

// 获取分类数据
async function getCategories() {
    return await apiRequest(API_CONFIG.endpoints.categories);
}

// ============================================
// 数据生成函数（模拟数据）
// ============================================

// 生成模拟菜单
function generateMockMenu() {
    const mockRecipes = {
        '春笋炒肉片': {
            菜品标识: 'SPRING001',
            菜品名称: '春笋炒肉片',
            菜品描述: '春季时令菜，春笋鲜嫩爽口',
            菜品分类: ['主菜'],
            准备时间: 15,
            烹饪时间: 10,
            难度等级: '初级',
            标准份量: { 基准人数: 6, 食材列表: [
                { 食材名称: '春笋', 用量: 500, 单位: '克' },
                { 食材名称: '猪里脊肉', 用量: 300, 单位: '克' }
            ]}
        },
        '凉拌黄瓜': {
            菜品标识: 'SUMMER001',
            菜品名称: '凉拌黄瓜',
            菜品描述: '夏季开胃凉菜',
            菜品分类: ['配菜'],
            准备时间: 10,
            烹饪时间: 0,
            难度等级: '初级'
        },
        '番茄蛋汤': {
            菜品标识: 'ALL001',
            菜品名称: '番茄蛋汤',
            菜品描述: '经典家常汤品',
            菜品分类: ['汤品'],
            准备时间: 5,
            烹饪时间: 10,
            难度等级: '初级'
        },
        '米饭': {
            菜品标识: 'STAPLE001',
            菜品名称: '米饭',
            菜品描述: '基础主食',
            菜品分类: ['主食'],
            准备时间: 5,
            烹饪时间: 20,
            难度等级: '初级'
        }
    };
    
    return {
        主菜: [mockRecipes['春笋炒肉片']],
        配菜: [mockRecipes['凉拌黄瓜']],
        汤品: [mockRecipes['番茄蛋汤']],
        主食: [mockRecipes['米饭']]
    };
}

// 生成模拟营养信息
function generateMockNutrition() {
    return {
        总量: {
            热量: 1850,
            蛋白质: 85,
            碳水化合物: 210,
            脂肪: 65,
            纤维素: 12
        },
        百分比: {
            热量: 75,
            蛋白质: 90,
            碳水化合物: 70,
            脂肪: 50,
            纤维素: 48
        },
        评价: {
            热量: '适中',
            蛋白质: '充足',
            脂肪: '适中',
            总体: '营养均衡'
        },
        建议: ['当前菜单营养均衡，继续保持']
    };
}

// 生成模拟购物清单
function generateMockShoppingList() {
    return {
        清单: {
            蔬菜类: [
                { 名称: '春笋', 用量: 500, 单位: '克', 已购买: false },
                { 名称: '黄瓜', 用量: 2, 单位: '根', 已购买: false },
                { 名称: '番茄', 用量: 3, 单位: '个', 已购买: false }
            ],
            肉类: [
                { 名称: '猪里脊肉', 用量: 300, 单位: '克', 已购买: false }
            ],
            蛋奶类: [
                { 名称: '鸡蛋', 用量: 3, 单位: '个', 已购买: false }
            ],
            调味品: [
                { 名称: '盐', 用量: '适量', 单位: '', 已购买: false },
                { 名称: '生抽', 用量: '2汤匙', 单位: '', 已购买: false }
            ]
        },
        统计: {
            总项数: 7,
            分类统计: { 蔬菜类: 3, 肉类: 1, 蛋奶类: 1, 调味品: 2 }
        }
    };
}

// 获取模拟菜谱
function getMockRecipes() {
    return [
        {
            菜品标识: 'SPRING001',
            菜品名称: '春笋炒肉片',
            菜品描述: '春季时令菜，春笋鲜嫩爽口',
            菜品分类: ['主菜', '时令菜'],
            适用季节: ['春季'],
            难度等级: '初级',
            准备时间: 15,
            烹饪时间: 10,
            菜品标签: ['春季时令', '快手菜']
        },
        {
            菜品标识: 'SUMMER001',
            菜品名称: '凉拌黄瓜',
            菜品描述: '夏季开胃凉菜，清爽解腻',
            菜品分类: ['配菜', '凉菜'],
            适用季节: ['夏季'],
            难度等级: '初级',
            准备时间: 10,
            烹饪时间: 0,
            菜品标签: ['凉菜', '快手菜']
        },
        {
            菜品标识: 'ALL001',
            菜品名称: '番茄炒蛋',
            菜品描述: '经典家常菜，营养丰富',
            菜品分类: ['主菜'],
            适用季节: ['春季', '夏季', '秋季', '冬季'],
            难度等级: '初级',
            准备时间: 10,
            烹饪时间: 5,
            菜品标签: ['家常菜', '快手菜']
        }
    ];
}

// 获取模拟分类
function getMockCategories() {
    return {
        菜品分类: {
            菜品类型: {
                主菜: ['肉类菜肴', '禽类菜肴', '海鲜类', '豆制品类'],
                配菜: ['叶菜类', '根茎类', '菌菇类'],
                汤品: ['清汤类', '浓汤类', '羹汤类'],
                主食: ['米饭类', '面食类', '杂粮类']
            }
        },
        时令数据: {
            季节月份对应: {
                春季: { 月份: ['三月', '四月', '五月'] }
            }
        },
        食材索引: {
            食材分类: {
                蔬菜类: { 叶菜类: ['菠菜', '青菜'] }
            }
        }
    };
}

// ============================================
// DOM操作函数
// ============================================

// 显示/隐藏加载状态
function showLoading() {
    AppState.uiState.isLoading = true;
    const loadingElement = document.getElementById('加载状态');
    if (loadingElement) {
        loadingElement.classList.add('show');
    }
    document.body.style.cursor = 'wait';
}

function hideLoading() {
    AppState.uiState.isLoading = false;
    const loadingElement = document.getElementById('加载状态');
    if (loadingElement) {
        loadingElement.classList.remove('show');
    }
    document.body.style.cursor = 'default';
}

// 更新人数显示
function 调整人数(delta) {
    const input = document.getElementById('用餐人数');
    let value = parseInt(input.value) + delta;
    value = Math.max(1, Math.min(20, value));
    input.value = value;
    AppState.settings.用餐人数 = value;
    saveSettings();
}

// 选择季节
function 选择季节(season) {
    AppState.settings.季节 = season;
    saveSettings();
    
    // 更新UI
    document.querySelectorAll('.季节选项').forEach(option => {
        option.classList.toggle('active', option.dataset.season === season);
    });
    
    document.getElementById('当前季节').textContent = season;
    showNotification('季节已更新', `已切换为${season}菜单`, 'success');
}

// 切换标签选择
function 切换标签(element) {
    const parent = element.parentElement;
    const value = element.dataset.value;
    
    if (parent.id === '口味标签' || parent.id === '需求标签') {
        const isTaste = parent.id === '口味标签';
        const settingKey = isTaste ? '口味偏好' : '特殊需求';
        
        if (value === '无限制') {
            // 清除其他标签
            Array.from(parent.children).forEach(child => {
                child.classList.remove('active');
            });
            element.classList.add('active');
            AppState.settings[settingKey] = ['无限制'];
        } else {
            // 移除"无限制"标签
            const noneTag = parent.querySelector('[data-value="无限制"]');
            if (noneTag) noneTag.classList.remove('active');
            
            element.classList.toggle('active');
            
            // 更新设置
            const activeTags = Array.from(parent.querySelectorAll('.标签.active'))
                .map(tag => tag.dataset.value);
            
            AppState.settings[settingKey] = activeTags.length > 0 ? activeTags : ['无限制'];
        }
        
        saveSettings();
    }
}

// 保存设置
function saveSettings() {
    saveToStorage('userSettings', AppState.settings);
}

// 加载设置
function loadSettings() {
    const saved = loadFromStorage('userSettings');
    if (saved) {
        AppState.settings = { ...AppState.settings, ...saved };
        updateSettingsUI();
    }
}

// 更新设置UI
function updateSettingsUI() {
    // 更新人数
    const peopleInput = document.getElementById('用餐人数');
    if (peopleInput) {
        peopleInput.value = AppState.settings.用餐人数;
    }
    
    // 更新季节
    const seasonElements = document.querySelectorAll('.季节选项');
    seasonElements.forEach(element => {
        element.classList.toggle('active', element.dataset.season === AppState.settings.季节);
    });
    
    // 更新天气
    const weatherSelect = document.getElementById('天气选择');
    if (weatherSelect) {
        weatherSelect.value = AppState.settings.天气;
    }
    
    // 更新口味偏好
    updateTagSelection('口味标签', AppState.settings.口味偏好);
    updateTagSelection('需求标签', AppState.settings.特殊需求);
}

// 更新标签选择状态
function updateTagSelection(containerId, selectedValues) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    Array.from(container.children).forEach(tag => {
        const value = tag.dataset.value;
        tag.classList.toggle('active', selectedValues.includes(value));
    });
}

// ============================================
// 菜单生成和显示
// ============================================

// 生成菜单
async function 生成菜单() {
    try {
        showNotification('开始生成', '正在为您智能搭配菜单...', 'info');
        
        const response = await getRecommendations(AppState.settings);
        
        if (response.成功) {
            AppState.currentMenu = response;
            
            // 显示菜单区域
            const menuSection = document.getElementById('菜单区域');
            if (menuSection) {
                menuSection.classList.add('show');
            }
            
            // 更新UI
            updateMenuUI(response);
            
            // 保存到历史
            saveToHistory(response);
            
            showNotification('菜单生成成功', '已为您生成营养均衡的菜单', 'success');
        } else {
            throw new Error(response.错误 || '生成菜单失败');
        }
    } catch (error) {
        console.error('生成菜单失败:', error);
        showNotification('生成失败', error.message || '请稍后重试', 'error');
    }
}

// 重新生成菜单
async function 重新生成() {
    await 生成菜单();
}

// 更新菜单UI
function updateMenuUI(menuData) {
    // 更新菜单信息
    const menuDate = document.getElementById('菜单日期');
    const menuPeople = document.getElementById('菜单人数');
    const totalTime = document.getElementById('总耗时');
    
    if (menuDate) menuDate.textContent = '今天';
    if (menuPeople) menuPeople.textContent = AppState.settings.用餐人数;
    
    // 计算总耗时
    if (totalTime && menuData.菜单) {
        let totalMinutes = 0;
        Object.values(menuData.菜单).flat().forEach(recipe => {
            totalMinutes += (recipe.准备时间 || 0) + (recipe.烹饪时间 || 0);
        });
        totalTime.textContent = formatTime(totalMinutes);
    }
    
    // 渲染菜谱卡片
    renderRecipeCards(menuData.菜单);
    
    // 更新营养信息
    updateNutritionInfo(menuData.营养信息);
    
    // 更新购物车数量
    updateShoppingCartCount();
}

// 渲染菜谱卡片
function renderRecipeCards(menu) {
    const grid = document.getElementById('菜单网格');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // 按类别渲染
    const categories = ['主菜', '配菜', '汤品', '主食'];
    
    categories.forEach(category => {
        const recipes = menu[category] || [];
        if (recipes.length === 0) return;
        
        // 添加类别标题
        const categoryHeader = document.createElement('div');
        categoryHeader.className = '菜谱类别标题';
        categoryHeader.style.gridColumn = '1 / -1';
        categoryHeader.innerHTML = `<h3>${category}</h3>`;
        grid.appendChild(categoryHeader);
        
        // 渲染该类别下的菜谱
        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe, category);
            grid.appendChild(card);
        });
    });
}

// 创建菜谱卡片
function createRecipeCard(recipe, category = '') {
    const card = document.createElement('div');
    card.className = '菜谱卡片';
    card.dataset.id = recipe.菜品标识;
    
    // 获取或生成图片
    const imageUrl = recipe.图片 || getRecipeImage(recipe.菜品名称);
    const isFavorite = AppState.userData.favorites.has(recipe.菜品标识);
    
    card.innerHTML = `
        <div class="菜谱图片" style="background: linear-gradient(45deg, ${getCategoryColor(category)}, ${getCategoryColor(category, true)})">
            <i class="fas ${getRecipeIcon(recipe.菜品名称)}"></i>
        </div>
        <div class="菜谱内容">
            <h3 class="菜谱标题">${recipe.菜品名称}</h3>
            <p class="菜谱描述">${recipe.菜品描述 || '美味的菜品'}</p>
            
            <div class="菜谱元信息">
                <div class="元信息项">
                    <i class="far fa-clock"></i>
                    <span>${formatTime((recipe.准备时间 || 0) + (recipe.烹饪时间 || 0))}</span>
                </div>
                <div class="元信息项">
                    <i class="fas fa-chart-line"></i>
                    <span>${recipe.难度等级 || '初级'}</span>
                </div>
                <div class="元信息项">
                    <i class="fas fa-users"></i>
                    <span>${recipe.标准份量?.基准人数 || 4}人</span>
                </div>
            </div>
            
            <div class="菜谱标签">
                ${(recipe.菜品标签 || []).map(tag => 
                    `<span class="标签项">${tag}</span>`
                ).join('')}
            </div>
            
            <div class="菜谱操作">
                <button class="详情按钮" onclick="查看菜谱详情('${recipe.菜品标识}')">
                    <i class="fas fa-book-open"></i>
                    查看详情
                </button>
                <button class="收藏按钮 ${isFavorite ? 'active' : ''}" 
                        onclick="切换收藏('${recipe.菜品标识}', this)">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// 获取菜谱图标
function getRecipeIcon(recipeName) {
    const iconMap = {
        '春笋': 'fa-seedling',
        '黄瓜': 'fa-cucumber',
        '番茄': 'fa-apple-alt',
        '鸡蛋': 'fa-egg',
        '肉': 'fa-drumstick-bite',
        '鱼': 'fa-fish',
        '虾': 'fa-shrimp',
        '米饭': 'fa-bowl-rice',
        '面条': 'fa-wheat-awn',
        '汤': 'fa-bowl-hot'
    };
    
    for (const [keyword, icon] of Object.entries(iconMap)) {
        if (recipeName.includes(keyword)) {
            return icon;
        }
    }
    
    return 'fa-utensils';
}

// 获取菜谱图片
function getRecipeImage(recipeName) {
    // 这里可以替换为实际的图片URL或base64
    return `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(recipeName)}`;
}

// 获取类别颜色
function getCategoryColor(category, light = false) {
    const colors = {
        '主菜': light ? '#4ECDC4' : '#2E8B57',
        '配菜': light ? '#A8E6CF' : '#4CAF50',
        '汤品': light ? '#FFD3B6' : '#FF9800',
        '主食': light ? '#FFAAA5' : '#FF6B35'
    };
    
    return colors[category] || (light ? '#C7CEEA' : '#9575CD');
}

// 更新营养信息
function updateNutritionInfo(nutritionData) {
    // 更新数值
    document.getElementById('总热量').textContent = nutritionData.总量.热量;
    document.getElementById('蛋白质').textContent = nutritionData.总量.蛋白质;
    document.getElementById('碳水化合物').textContent = nutritionData.总量.碳水化合物;
    document.getElementById('脂肪').textContent = nutritionData.总量.脂肪;
    
    // 更新进度条
    updateProgressBar('总热量', nutritionData.百分比.热量);
    updateProgressBar('蛋白质', nutritionData.百分比.蛋白质);
    updateProgressBar('碳水化合物', nutritionData.百分比.碳水化合物);
    updateProgressBar('脂肪', nutritionData.百分比.脂肪);
    
    // 更新评价
    const evaluation = document.getElementById('营养评价');
    if (evaluation) {
        const icon = nutritionData.评价.总体 === '营养均衡' ? 'fa-check-circle' : 'fa-exclamation-circle';
        const color = nutritionData.评价.总体 === '营养均衡' ? 'var(--color-success)' : 'var(--color-warning)';
        
        evaluation.innerHTML = `
            <i class="fas ${icon} 评价图标"></i>
            <span>${nutritionData.评价.总体}</span>
        `;
        evaluation.style.color = color;
    }
}

// 更新进度条
function updateProgressBar(elementId, percentage) {
    const progressBar = document.querySelector(`#${elementId}`).closest('.营养项')?.querySelector('.进度条');
    if (progressBar) {
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
    }
}

// ============================================
// 菜谱详情功能
// ============================================

// 查看菜谱详情
async function 查看菜谱详情(recipeId) {
    try {
        showLoading();
        
        // 从当前菜单或菜谱库中查找菜谱
        let recipe = null;
        
        if (AppState.currentMenu?.菜单) {
            const allRecipes = Object.values(AppState.currentMenu.菜单).flat();
            recipe = allRecipes.find(r => r.菜品标识 === recipeId);
        }
        
        if (!recipe && AppState.recipes.length > 0) {
            recipe = AppState.recipes.find(r => r.菜品标识 === recipeId);
        }
        
        if (!recipe) {
            // 尝试从API获取
            const response = await getRecipes({ id: recipeId });
            if (response.成功 && response.数据.length > 0) {
                recipe = response.数据[0];
            }
        }
        
        if (recipe) {
            showRecipeDetailModal(recipe);
        } else {
            throw new Error('未找到菜谱详情');
        }
    } catch (error) {
        console.error('获取菜谱详情失败:', error);
        showNotification('加载失败', '无法加载菜谱详情', 'error');
    } finally {
        hideLoading();
    }
}

// 显示菜谱详情模态框
function showRecipeDetailModal(recipe) {
    const modal = document.getElementById('菜谱详情弹窗');
    const title = document.getElementById('详情标题');
    const content = document.getElementById('详情内容');
    
    if (!modal || !title || !content) return;
    
    // 设置标题
    title.textContent = recipe.菜品名称;
    
    // 构建详情内容
    const isFavorite = AppState.userData.favorites.has(recipe.菜品标识);
    
    content.innerHTML = `
        <div class="菜谱详情">
            <!-- 头部信息 -->
            <div class="详情头部">
                <div class="详情图片" style="background: linear-gradient(45deg, var(--color-primary), var(--color-accent))">
                    <i class="fas ${getRecipeIcon(recipe.菜品名称)}"></i>
                </div>
                <div class="详情摘要">
                    <div class="摘要项">
                        <i class="far fa-clock"></i>
                        <span>总时间: ${formatTime((recipe.准备时间 || 0) + (recipe.烹饪时间 || 0))}</span>
                    </div>
                    <div class="摘要项">
                        <i class="fas fa-chart-line"></i>
                        <span>难度: ${recipe.难度等级 || '初级'}</span>
                    </div>
                    <div class="摘要项">
                        <i class="fas fa-users"></i>
                        <span>份量: ${recipe.标准份量?.基准人数 || 4}人</span>
                    </div>
                    <div class="摘要项">
                        <i class="fas fa-leaf"></i>
                        <span>季节: ${(recipe.适用季节 || ['四季']).join(', ')}</span>
                    </div>
                </div>
            </div>
            
            <!-- 描述 -->
            ${recipe.菜品描述 ? `<div class="详情描述">${recipe.菜品描述}</div>` : ''}
            
            <!-- 食材清单 -->
            <div class="详情食材">
                <h4><i class="fas fa-shopping-basket"></i> 食材清单</h4>
                ${renderIngredients(recipe.标准份量?.食材列表 || [], recipe.标准份量?.调味料 || [])}
            </div>
            
            <!-- 烹饪步骤 -->
            ${recipe.烹饪步骤 ? `
                <div class="详情步骤">
                    <h4><i class="fas fa-list-ol"></i> 烹饪步骤</h4>
                    ${renderCookingSteps(recipe.烹饪步骤)}
                </div>
            ` : ''}
            
            <!-- 烹饪技巧 -->
            ${recipe.烹饪技巧 ? `
                <div class="详情技巧">
                    <h4><i class="fas fa-lightbulb"></i> 烹饪技巧</h4>
                    <ul>
                        ${recipe.烹饪技巧.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <!-- 操作按钮 -->
            <div class="详情操作">
                <button class="操作按钮" onclick="添加购物车('${recipe.菜品标识}')">
                    <i class="fas fa-cart-plus"></i>
                    加入购物车
                </button>
                <button class="操作按钮 ${isFavorite ? 'active' : ''}" 
                        onclick="切换收藏('${recipe.菜品标识}', this.closest('.详情操作'))">
                    <i class="fas fa-heart"></i>
                    ${isFavorite ? '已收藏' : '收藏'}
                </button>
                <button class="操作按钮" onclick="打印菜谱('${recipe.菜品标识}')">
                    <i class="fas fa-print"></i>
                    打印
                </button>
            </div>
        </div>
    `;
    
    // 显示模态框
    showModal('菜谱详情弹窗');
}

// 渲染食材清单
function renderIngredients(ingredients, seasonings) {
    let html = '<div class="食材分类">';
    
    if (ingredients.length > 0) {
        html += `
            <div class="分类标题">主要食材</div>
            <ul class="食材列表">
                ${ingredients.map(ing => `
                    <li>
                        <span class="食材名称">${ing.食材名称}</span>
                        <span class="食材用量">${ing.用量} ${ing.单位}</span>
                        ${ing.处理方式 ? `<span class="食材处理">(${ing.处理方式})</span>` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    if (seasonings.length > 0) {
        html += `
            <div class="分类标题">调味料</div>
            <ul class="食材列表">
                ${seasonings.map(ing => `
                    <li>
                        <span class="食材名称">${ing.名称}</span>
                        <span class="食材用量">${ing.用量} ${ing.单位}</span>
                        ${ing.备注 ? `<span class="食材处理">(${ing.备注})</span>` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    html += '</div>';
    return html;
}

// 渲染烹饪步骤
function renderCookingSteps(steps) {
    if (!Array.isArray(steps)) return '';
    
    return `
        <div class="步骤列表">
            ${steps.map((step, index) => `
                <div class="步骤项">
                    <div class="步骤序号">${step.步骤序号 || index + 1}</div>
                    <div class="步骤内容">
                        <div class="步骤描述">${step.步骤描述}</div>
                        ${step.烹饪技巧 ? `<div class="步骤技巧"><i class="fas fa-tips"></i> ${step.烹饪技巧}</div>` : ''}
                        ${step.预计时间 ? `<div class="步骤时间"><i class="far fa-clock"></i> ${step.预计时间}分钟</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// 用户收藏功能
// ============================================

// 切换收藏状态
function 切换收藏(recipeId, button) {
    const favorites = AppState.userData.favorites;
    
    if (favorites.has(recipeId)) {
        favorites.delete(recipeId);
        showNotification('已取消收藏', '菜谱已从收藏夹移除', 'info');
    } else {
        favorites.add(recipeId);
        showNotification('收藏成功', '菜谱已添加到收藏夹', 'success');
    }
    
    // 更新UI
    if (button) {
        const icon = button.querySelector('i');
        if (icon) {
            if (favorites.has(recipeId)) {
                button.classList.add('active');
                if (icon.classList.contains('far')) {
                    icon.classList.replace('far', 'fas');
                }
            } else {
                button.classList.remove('active');
                if (icon.classList.contains('fas')) {
                    icon.classList.replace('fas', 'far');
                }
            }
        }
    }
    
    // 保存收藏
    saveUserData();
}

// 加载收藏夹
function loadFavorites() {
    const favorites = loadFromStorage('userFavorites', []);
    AppState.userData.favorites = new Set(favorites);
    
    // 渲染收藏页面
    renderFavorites();
}

// 渲染收藏页面
function renderFavorites() {
    const grid = document.getElementById('收藏网格');
    if (!grid) return;
    
    // TODO: 从菜谱数据中获取收藏的菜谱详情
    // 这里简化处理
    grid.innerHTML = '<p class="空状态">暂无收藏的菜谱</p>';
    
    // 更新收藏数量显示
    updateFavoriteCount();
}

// 清空收藏
function 清空收藏() {
    if (AppState.userData.favorites.size === 0) {
        showNotification('提示', '收藏夹已经是空的', 'info');
        return;
    }
    
    if (confirm('确定要清空所有收藏吗？')) {
        AppState.userData.favorites.clear();
        saveUserData();
        renderFavorites();
        showNotification('已清空', '收藏夹已清空', 'success');
    }
}

// 更新收藏数量显示
function updateFavoriteCount() {
    const count = AppState.userData.favorites.size;
    // 可以在导航栏显示收藏数量
    const favoriteBadge = document.querySelector('a[data-page="favorites"] .徽章');
    if (favoriteBadge) {
        favoriteBadge.textContent = count > 0 ? count : '';
    }
}

// ============================================
// 购物车功能
// ============================================

// 添加购物车
function 添加购物车(recipeId) {
    // 从当前菜单或菜谱库中查找菜谱
    let recipe = null;
    
    if (AppState.currentMenu?.菜单) {
        const allRecipes = Object.values(AppState.currentMenu.菜单).flat();
        recipe = allRecipes.find(r => r.菜品标识 === recipeId);
    }
    
    if (!recipe) {
        recipe = AppState.recipes.find(r => r.菜品标识 === recipeId);
    }
    
    if (!recipe) {
        showNotification('错误', '未找到菜谱信息', 'error');
        return;
    }
    
    // 将菜谱的食材添加到购物车
    const ingredients = recipe.标准份量?.食材列表 || [];
    const existingItems = new Set(AppState.shoppingCart.map(item => item.名称));
    
    let addedCount = 0;
    ingredients.forEach(ingredient => {
        if (!existingItems.has(ingredient.食材名称)) {
            AppState.shoppingCart.push({
                名称: ingredient.食材名称,
                用量: ingredient.用量,
                单位: ingredient.单位,
                来源菜谱: recipe.菜品名称,
                已购买: false
            });
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        saveShoppingCart();
        updateShoppingCartCount();
        showNotification('添加成功', `已添加${addedCount}项食材到购物车`, 'success');
    } else {
        showNotification('提示', '购物车中已包含这些食材', 'info');
    }
}

// 保存购物车
function saveShoppingCart() {
    saveToStorage('shoppingCart', AppState.shoppingCart);
}

// 加载购物车
function loadShoppingCart() {
    const saved = loadFromStorage('shoppingCart', []);
    AppState.shoppingCart = saved;
    updateShoppingCartCount();
}

// 更新购物车数量显示
function updateShoppingCartCount() {
    const count = AppState.shoppingCart.length;
    const cartBadge = document.getElementById('购物车数量');
    if (cartBadge) {
        cartBadge.textContent = count > 0 ? count : '';
    }
}

// 清空购物车
function 清空购物车() {
    if (AppState.shoppingCart.length === 0) {
        showNotification('提示', '购物车已经是空的', 'info');
        return;
    }
    
    if (confirm('确定要清空购物车吗？')) {
        AppState.shoppingCart = [];
        saveShoppingCart();
        updateShoppingCartCount();
        
        // 重新渲染购物车页面
        if (AppState.uiState.currentPage === 'shopping') {
            renderShoppingCart();
        }
        
        showNotification('已清空', '购物车已清空', 'success');
    }
}

// 渲染购物车页面
function renderShoppingCart() {
    const container = document.getElementById('购物清单');
    if (!container) return;
    
    if (AppState.shoppingCart.length === 0) {
        container.innerHTML = '<div class="空状态"><i class="fas fa-shopping-cart"></i><p>购物车是空的</p></div>';
        return;
    }
    
    // 按食材分类分组
    const categories = {
        蔬菜类: [],
        肉类: [],
        水产类: [],
        调味品: [],
        主食类: [],
        其他: []
    };
    
    AppState.shoppingCart.forEach(item => {
        const category = categorizeIngredient(item.名称);
        if (categories[category]) {
            categories[category].push(item);
        }
    });
    
    // 构建HTML
    let html = '';
    
    for (const [categoryName, items] of Object.entries(categories)) {
        if (items.length === 0) continue;
        
        html += `
            <div class="清单分类">
                <div class="分类头部" onclick="this.classList.toggle('active')">
                    <div class="分类标题">
                        <i class="fas ${getCategoryIcon(categoryName)}"></i>
                        <span>${categoryName}</span>
                        <span class="分类数量">${items.length}项</span>
                    </div>
                    <i class="fas fa-chevron-down 分类切换"></i>
                </div>
                <div class="分类内容">
                    ${items.map(item => `
                        <div class="清单项">
                            <input type="checkbox" class="清单项输入" 
                                   ${item.已购买 ? 'checked' : ''}
                                   onchange="togglePurchase('${item.名称}', this.checked)">
                            <span class="清单项名称">${item.名称}</span>
                            <span class="清单项用量">${item.用量} ${item.单位}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 添加统计
    const purchasedCount = AppState.shoppingCart.filter(item => item.已购买).length;
    
    html += `
        <div class="清单统计">
            <div class="统计项">
                <span>总项数</span>
                <span>${AppState.shoppingCart.length}</span>
            </div>
            <div class="统计项">
                <span>已购买</span>
                <span>${purchasedCount}</span>
            </div>
            <div class="统计项">
                <span>未购买</span>
                <span>${AppState.shoppingCart.length - purchasedCount}</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// 切换购买状态
function togglePurchase(itemName, purchased) {
    const item = AppState.shoppingCart.find(i => i.名称 === itemName);
    if (item) {
        item.已购买 = purchased;
        saveShoppingCart();
    }
}

// 打印清单
function 打印清单() {
    if (AppState.shoppingCart.length === 0) {
        showNotification('提示', '购物车是空的', 'info');
        return;
    }
    
    window.print();
}

// 分类食材
function categorizeIngredient(name) {
    const categories = {
        蔬菜类: ['菜', '笋', '菇', '菌', '椒', '瓜', '茄', '豆', '萝卜', '胡萝卜', '土豆', '红薯'],
        肉类: ['肉', '排', '腿', '蹄', '肝', '肚', '肠'],
        水产类: ['鱼', '虾', '蟹', '贝', '蛤', '蛏', '蚝', '参'],
        调味品: ['油', '盐', '酱', '醋', '糖', '料酒', '生抽', '老抽', '蚝油', '香油'],
        主食类: ['米', '面', '粉', '饭', '粥', '馒头', '包子', '饺子']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (name.includes(keyword)) {
                return category;
            }
        }
    }
    
    return '其他';
}

// 获取分类图标
function getCategoryIcon(category) {
    const icons = {
        蔬菜类: 'fa-seedling',
        肉类: 'fa-drumstick-bite',
        水产类: 'fa-fish',
        调味品: 'fa-mortar-pestle',
        主食类: 'fa-bowl-rice',
        其他: 'fa-box'
    };
    return icons[category] || 'fa-box';
}

// ============================================
// 导出功能
// ============================================

// 导出PDF
async function 导出PDF() {
    try {
        if (!AppState.currentMenu) {
            showNotification('提示', '请先生成菜单', 'warning');
            return;
        }
        
        showLoading();
        showNotification('正在生成', 'PDF文件生成中...', 'info');
        
        // 使用jsPDF库生成PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // 添加标题
        doc.setFontSize(20);
        doc.setTextColor(46, 139, 87);
        doc.text('智能推荐菜单', 20, 20);
        
        // 添加基本信息
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 20, 35);
        doc.text(`用餐人数: ${AppState.settings.用餐人数}人`, 20, 42);
        doc.text(`适用季节: ${AppState.settings.季节}`, 20, 49);
        
        let y = 65;
        
        // 添加菜单
        doc.setFontSize(16);
        doc.setTextColor(46, 139, 87);
        doc.text('推荐菜单', 20, y);
        y += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        Object.entries(AppState.currentMenu.菜单).forEach(([category, recipes]) => {
            if (recipes.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(255, 107, 53);
                doc.text(`${category}:`, 25, y);
                y += 7;
                
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                
                recipes.forEach(recipe => {
                    doc.text(`  • ${recipe.菜品名称}`, 30, y);
                    y += 7;
                    
                    // 如果位置不够，添加新页面
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                });
                y += 3;
            }
        });
        
        // 添加营养信息
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(16);
        doc.setTextColor(46, 139, 87);
        doc.text('营养分析', 20, y);
        y += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        const nutrition = AppState.currentMenu.营养信息;
        doc.text(`总热量: ${nutrition.总量.热量} 大卡 (${nutrition.百分比.热量}%)`, 25, y);
        y += 7;
        doc.text(`蛋白质: ${nutrition.总量.蛋白质} 克 (${nutrition.百分比.蛋白质}%)`, 25, y);
        y += 7;
        doc.text(`碳水化合物: ${nutrition.总量.碳水化合物} 克 (${nutrition.百分比.碳水化合物}%)`, 25, y);
        y += 7;
        doc.text(`脂肪: ${nutrition.总量.脂肪} 克 (${nutrition.百分比.脂肪}%)`, 25, y);
        y += 10;
        
        // 保存PDF
        doc.save(`菜单-${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoading();
        showNotification('导出成功', 'PDF文件已保存', 'success');
    } catch (error) {
        hideLoading();
        console.error('导出PDF失败:', error);
        showNotification('导出失败', '请确保已加载jsPDF库', 'error');
    }
}

// 导出图片
async function 导出图片() {
    try {
        if (!AppState.currentMenu) {
            showNotification('提示', '请先生成菜单', 'warning');
            return;
        }
        
        showNotification('正在生成', '图片生成中...', 'info');
        
        // 使用html2canvas生成图片
        const menuSection = document.getElementById('菜单区域');
        if (!menuSection) {
            throw new Error('未找到菜单区域');
        }
        
        const canvas = await html2canvas(menuSection, {
            backgroundColor: '#FFFFFF',
            scale: 2,
            useCORS: true
        });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `菜单截图-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showNotification('导出成功', '图片已保存', 'success');
    } catch (error) {
        console.error('导出图片失败:', error);
        showNotification('导出失败', '请确保已加载html2canvas库', 'error');
    }
}

// 生成购物清单
function 生成购物清单() {
    if (!AppState.currentMenu?.购物清单) {
        showNotification('提示', '请先生成菜单', 'warning');
        return;
    }
    
    // 切换到购物车页面
    switchPage('shopping');
    
    // 添加菜单的购物清单到购物车
    const shoppingList = AppState.currentMenu.购物清单;
    Object.values(shoppingList.清单).flat().forEach(item => {
        if (!AppState.shoppingCart.some(cartItem => cartItem.名称 === item.名称)) {
            AppState.shoppingCart.push({
                ...item,
                已购买: false
            });
        }
    });
    
    saveShoppingCart();
    renderShoppingCart();
    updateShoppingCartCount();
    
    showNotification('清单已生成', '购物清单已添加到购物车', 'success');
}

// 分享菜单
function 分享菜单() {
    if (!AppState.currentMenu) {
        showNotification('提示', '请先生成菜单', 'warning');
        return;
    }
    
    const shareData = {
        title: '智能推荐菜单',
        text: `看看我为${AppState.settings.用餐人数}人精心搭配的${AppState.settings.季节}菜单！`,
        url: window.location.href
    };
    
    if (navigator.share && navigator.canShare(shareData)) {
        navigator.share(shareData)
            .then(() => showNotification('分享成功', '菜单已分享', 'success'))
            .catch(error => {
                console.error('分享失败:', error);
                copyToClipboard(window.location.href);
            });
    } else {
        // 如果不支持Web Share API，使用复制链接
        copyToClipboard(window.location.href);
    }
}

// 保存收藏
function 保存收藏() {
    if (!AppState.currentMenu) {
        showNotification('提示', '请先生成菜单', 'warning');
        return;
    }
    
    // 将当前菜单的所有菜谱添加到收藏
    let addedCount = 0;
    Object.values(AppState.currentMenu.菜单).flat().forEach(recipe => {
        if (!AppState.userData.favorites.has(recipe.菜品标识)) {
            AppState.userData.favorites.add(recipe.菜品标识);
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        saveUserData();
        updateFavoriteCount();
        showNotification('收藏成功', `已收藏${addedCount}道菜谱`, 'success');
    } else {
        showNotification('提示', '菜单中的菜谱已全部收藏', 'info');
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('链接已复制', '菜单链接已复制到剪贴板', 'success'))
        .catch(error => {
            console.error('复制失败:', error);
            showNotification('复制失败', '请手动复制链接', 'error');
        });
}

// ============================================
// 页面导航功能
// ============================================

// 切换页面
function switchPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.页面').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
    }
    
    // 更新导航状态
    document.querySelectorAll('.导航项').forEach(navItem => {
        navItem.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`.导航项[data-page="${pageId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // 更新状态
    AppState.uiState.currentPage = pageId;
    
    // 如果切换到购物车页面，重新渲染
    if (pageId === 'shopping') {
        renderShoppingCart();
    }
    
    // 如果切换到收藏页面，重新渲染
    if (pageId === '我的收藏') {
        renderFavorites();
    }
}

// 初始化页面导航
function initPageNavigation() {
    // 为导航项添加点击事件
    document.querySelectorAll('.导航项[data-page]').forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = navItem.dataset.page;
            switchPage(pageId);
            
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // 处理hash路由
    function handleHashChange() {
        const hash = window.location.hash.substring(1) || 'home';
        switchPage(hash);
    }
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // 初始加载
}

// ============================================
// 模态框功能
// ============================================

// 显示模态框
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const container = document.getElementById('模态框容器');
    
    if (modal && container) {
        container.classList.add('show');
        modal.style.display = 'block';
        AppState.uiState.modalOpen = modalId;
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏模态框
function hideModal() {
    const container = document.getElementById('模态框容器');
    if (container) {
        container.classList.remove('show');
        AppState.uiState.modalOpen = null;
        document.body.style.overflow = '';
    }
}

// 显示添加菜谱弹窗
function 显示添加菜谱弹窗() {
    showModal('添加菜谱弹窗');
}

// 隐藏添加菜谱弹窗
function 隐藏添加菜谱弹窗() {
    hideModal();
}

// 显示手动表单
function 显示手动表单() {
    const container = document.getElementById('手动表单容器');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <form id="手动菜谱表单" onsubmit="提交菜谱表单(event)">
                <div class="表单组">
                    <label for="菜品名称"><i class="fas fa-utensils"></i> 菜品名称 *</label>
                    <input type="text" id="菜品名称" required placeholder="请输入菜品名称">
                </div>
                
                <div class="表单组">
                    <label for="菜品描述"><i class="fas fa-align-left"></i> 菜品描述</label>
                    <textarea id="菜品描述" placeholder="简单描述菜品特点" rows="3"></textarea>
                </div>
                
                <div class="表单组 双列">
                    <div>
                        <label for="准备时间"><i class="far fa-clock"></i> 准备时间(分钟)</label>
                        <input type="number" id="准备时间" min="0" max="300" placeholder="15">
                    </div>
                    <div>
                        <label for="烹饪时间"><i class="fas fa-clock"></i> 烹饪时间(分钟)</label>
                        <input type="number" id="烹饪时间" min="0" max="480" placeholder="10">
                    </div>
                </div>
                
                <div class="表单组">
                    <label><i class="fas fa-tags"></i> 菜品分类 *</label>
                    <div class="标签选择器" id="分类标签">
                        <span class="标签" data-value="主菜" onclick="切换表单标签(this)">主菜</span>
                        <span class="标签" data-value="配菜" onclick="切换表单标签(this)">配菜</span>
                        <span class="标签" data-value="汤品" onclick="切换表单标签(this)">汤品</span>
                        <span class="标签" data-value="主食" onclick="切换表单标签(this)">主食</span>
                    </div>
                </div>
                
                <div class="表单组">
                    <label><i class="fas fa-leaf"></i> 适用季节 *</label>
                    <div class="标签选择器" id="季节标签">
                        <span class="标签" data-value="春季" onclick="切换表单标签(this)">春季</span>
                        <span class="标签" data-value="夏季" onclick="切换表单标签(this)">夏季</span>
                        <span class="标签" data-value="秋季" onclick="切换表单标签(this)">秋季</span>
                        <span class="标签" data-value="冬季" onclick="切换表单标签(this)">冬季</span>
                    </div>
                </div>
                
                <div class="表单操作">
                    <button type="button" class="操作按钮 次要" onclick="隐藏添加菜谱弹窗()">取消</button>
                    <button type="submit" class="操作按钮 主要">提交菜谱</button>
                </div>
            </form>
        `;
    }
}

// 切换表单标签
function 切换表单标签(element) {
    element.classList.toggle('active');
}

// 提交菜谱表单
async function 提交菜谱表单(event) {
    event.preventDefault();
    
    try {
        const formData = {
            菜品名称: document.getElementById('菜品名称').value,
            菜品描述: document.getElementById('菜品描述').value,
            准备时间: parseInt(document.getElementById('准备时间').value) || 0,
            烹饪时间: parseInt(document.getElementById('烹饪时间').value) || 0,
            菜品分类: Array.from(document.querySelectorAll('#分类标签 .标签.active')).map(tag => tag.dataset.value),
            适用季节: Array.from(document.querySelectorAll('#季节标签 .标签.active')).map(tag => tag.dataset.value),
            难度等级: '初级',
            标准份量: {
                基准人数: AppState.settings.用餐人数,
                食材列表: []
            }
        };
        
        // 验证数据
        if (!formData.菜品名称.trim()) {
            throw new Error('菜品名称不能为空');
        }
        
        if (formData.菜品分类.length === 0) {
            throw new Error('请选择至少一个菜品分类');
        }
        
        if (formData.适用季节.length === 0) {
            throw new Error('请选择至少一个适用季节');
        }
        
        // 调用API上传
        const response = await apiRequest(API_CONFIG.endpoints.upload, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.成功) {
            showNotification('提交成功', '菜谱已提交，等待审核', 'success');
            隐藏添加菜谱弹窗();
            
            // 重置表单
            event.target.reset();
            document.querySelectorAll('#分类标签 .标签.active, #季节标签 .标签.active').forEach(tag => {
                tag.classList.remove('active');
            });
        } else {
            throw new Error(response.错误 || '提交失败');
        }
    } catch (error) {
        console.error('提交菜谱失败:', error);
        showNotification('提交失败', error.message, 'error');
    }
}

// 下载模板文件
function 下载模板文件() {
    const template = {
        菜品名称: "新菜品",
        菜品描述: "菜品简要描述",
        菜品分类: ["主菜"],
        适用季节: ["春季"],
        难度等级: "初级",
        准备时间: 15,
        烹饪时间: 10,
        标准份量: {
            基准人数: 4,
            食材列表: [
                {
                    食材名称: "主要食材",
                    用量: 100,
                    单位: "克",
                    处理方式: "切块"
                }
            ],
            调味料: [
                {
                    名称: "盐",
                    用量: "适量",
                    单位: ""
                }
            ]
        },
        烹饪步骤: [
            {
                步骤序号: 1,
                步骤描述: "第一步操作",
                烹饪技巧: "技巧提示",
                预计时间: 5
            }
        ],
        烹饪技巧: ["技巧一", "技巧二"],
        菜品标签: ["家常菜", "快手菜"]
    };
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '菜谱模板.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('模板已下载', '请填写模板后上传', 'success');
}

// 显示营养详情
function 显示营养详情() {
    if (!AppState.currentMenu?.营养信息) {
        showNotification('提示', '请先生成菜单', 'warning');
        return;
    }
    
    const nutrition = AppState.currentMenu.营养信息;
    const content = document.getElementById('营养详情内容');
    
    if (content) {
        content.innerHTML = `
            <div class="营养详情">
                <h4>详细分析</h4>
                <div class="详情网格">
                    <div class="详情项">
                        <div class="详情标签">热量摄入</div>
                        <div class="详情值">${nutrition.总量.热量} 大卡</div>
                        <div class="详情百分比">${nutrition.百分比.热量}%</div>
                        <div class="详情评价">${nutrition.评价.热量}</div>
                    </div>
                    <div class="详情项">
                        <div class="详情标签">蛋白质</div>
                        <div class="详情值">${nutrition.总量.蛋白质} 克</div>
                        <div class="详情百分比">${nutrition.百分比.蛋白质}%</div>
                        <div class="详情评价">${nutrition.评价.蛋白质}</div>
                    </div>
                    <div class="详情项">
                        <div class="详情标签">碳水化合物</div>
                        <div class="详情值">${nutrition.总量.碳水化合物} 克</div>
                        <div class="详情百分比">${nutrition.百分比.碳水化合物}%</div>
                        <div class="详情评价">适中</div>
                    </div>
                    <div class="详情项">
                        <div class="详情标签">脂肪</div>
                        <div class="详情值">${nutrition.总量.脂肪} 克</div>
                        <div class="详情百分比">${nutrition.百分比.脂肪}%</div>
                        <div class="详情评价">${nutrition.评价.脂肪}</div>
                    </div>
                </div>
                
                <div class="营养建议">
                    <h4>饮食建议</h4>
                    <ul>
                        ${nutrition.建议.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="参考信息">
                    <p><small>* 百分比基于成人每日推荐摄入量计算</small></p>
                </div>
            </div>
        `;
    }
    
    showModal('营养详情弹窗');
}

// 隐藏营养详情
function 隐藏营养详情() {
    hideModal();
}

// 隐藏菜谱详情
function 隐藏菜谱详情() {
    hideModal();
}

// 显示用户中心
function 显示用户中心() {
    const content = document.getElementById('用户信息');
    
    if (content) {
        const favoritesCount = AppState.userData.favorites.size;
        const historyCount = AppState.userData.history.length;
        
        content.innerHTML = `
            <div class="用户概览">
                <div class="用户头像">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="用户统计">
                    <div class="统计项">
                        <div class="统计值">${favoritesCount}</div>
                        <div class="统计标签">收藏菜谱</div>
                    </div>
                    <div class="统计项">
                        <div class="统计值">${historyCount}</div>
                        <div class="统计标签">历史菜单</div>
                    </div>
                </div>
            </div>
            
            <div class="用户操作">
                <button class="操作按钮" onclick="导出用户数据()">
                    <i class="fas fa-download"></i>
                    导出数据
                </button>
                <button class="操作按钮" onclick="清空历史()">
                    <i class="fas fa-trash"></i>
                    清空历史
                </button>
                <button class="操作按钮" onclick="显示设置()">
                    <i class="fas fa-cog"></i>
                    偏好设置
                </button>
            </div>
        `;
    }
    
    showModal('用户中心弹窗');
}

// 隐藏用户中心
function 隐藏用户中心() {
    hideModal();
}

// 导出用户数据
function 导出用户数据() {
    const userData = {
        favorites: Array.from(AppState.userData.favorites),
        history: AppState.userData.history,
        preferences: AppState.settings,
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `用户数据-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('导出成功', '用户数据已导出', 'success');
}

// 清空历史
function 清空历史() {
    if (AppState.userData.history.length === 0) {
        showNotification('提示', '历史记录已经是空的', 'info');
        return;
    }
    
    if (confirm('确定要清空所有历史记录吗？')) {
        AppState.userData.history = [];
        saveUserData();
        showNotification('已清空', '历史记录已清空', 'success');
    }
}

// 显示设置
function 显示设置() {
    // TODO: 实现设置页面
    showNotification('功能开发中', '设置功能即将上线', 'info');
}

// ============================================
// 主题切换功能
// ============================================

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    AppState.uiState.isDarkMode = savedTheme === 'dark';
    
    if (AppState.uiState.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeToggleIcon(true);
    } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeToggleIcon(false);
    }
}

// 切换主题
function toggleTheme() {
    AppState.uiState.isDarkMode = !AppState.uiState.isDarkMode;
    
    if (AppState.uiState.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
    
    updateThemeToggleIcon(AppState.uiState.isDarkMode);
    showNotification('主题切换', `已切换到${AppState.uiState.isDarkMode ? '深色' : '浅色'}主题`, 'info');
}

// 更新主题切换图标
function updateThemeToggleIcon(isDarkMode) {
    const toggleButton = document.getElementById('主题切换');
    if (toggleButton) {
        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// ============================================
// 数据初始化
// ============================================

// 加载用户数据
function loadUserData() {
    const savedData = loadFromStorage('userData');
    if (savedData) {
        AppState.userData = { ...AppState.userData, ...savedData };
        AppState.userData.favorites = new Set(AppState.userData.favorites || []);
    }
    
    loadFavorites();
    loadShoppingCart();
}

// 保存用户数据
function saveUserData() {
    const dataToSave = {
        ...AppState.userData,
        favorites: Array.from(AppState.userData.favorites)
    };
    saveToStorage('userData', dataToSave);
}

// 保存到历史
function saveToHistory(menuData) {
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        settings: { ...AppState.settings },
        menuSummary: {
            菜品数量: Object.values(menuData.菜单).flat().length,
            总热量: menuData.营养信息?.总量.热量 || 0
        }
    };
    
    AppState.userData.history.unshift(historyItem);
    
    // 只保留最近50条记录
    if (AppState.userData.history.length > 50) {
        AppState.userData.history = AppState.userData.history.slice(0, 50);
    }
    
    saveUserData();
}

// 初始化数据
async function initData() {
    try {
        // 加载分类数据
        const categoriesResponse = await getCategories();
        if (categoriesResponse.成功) {
            AppState.categories = categoriesResponse.数据;
        }
        
        // 获取菜谱总数
        const recipesResponse = await getRecipes({}, 1, 1);
        if (recipesResponse.成功) {
            document.getElementById('菜谱总数').textContent = recipesResponse.分页.总数量;
            document.getElementById('页脚菜谱数').textContent = recipesResponse.分页.总数量;
        }
        
        // 获取今日推荐数
        const today = new Date().toDateString();
        const todayRecommendations = AppState.userData.history.filter(
            item => new Date(item.timestamp).toDateString() === today
        ).length;
        
        document.getElementById('今日推荐').textContent = todayRecommendations;
        
    } catch (error) {
        console.error('初始化数据失败:', error);
    }
}

// ============================================
// 事件监听器
// ============================================

// 初始化事件监听
function initEventListeners() {
    // 主题切换
    const themeToggle = document.getElementById('主题切换');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 用户按钮
    const userButton = document.getElementById('用户按钮');
    if (userButton) {
        userButton.addEventListener('click', 显示用户中心);
    }
    
    // 模态框关闭
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('模态框容器') || 
            e.target.classList.contains('模态框关闭') ||
            e.target.closest('.模态框关闭')) {
            hideModal();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && AppState.uiState.modalOpen) {
            hideModal();
        }
    });
    
    // 搜索功能
    const searchInput = document.getElementById('菜谱搜索');
    if (searchInput) {
        const debouncedSearch = debounce((value) => {
            if (value.trim()) {
                performSearch(value);
            }
        }, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    // 天气选择
    const weatherSelect = document.getElementById('天气选择');
    if (weatherSelect) {
        weatherSelect.addEventListener('change', (e) => {
            AppState.settings.天气 = e.target.value;
            saveSettings();
        });
    }
}

// 执行搜索
async function performSearch(query) {
    try {
        showLoading();
        
        const response = await getRecipes({ 关键词: query });
        
        if (response.成功) {
            AppState.recipes = response.数据;
            renderSearchResults(response.数据);
        }
    } catch (error) {
        console.error('搜索失败:', error);
        showNotification('搜索失败', '请检查网络连接', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染搜索结果
function renderSearchResults(recipes) {
    const grid = document.getElementById('菜谱网格');
    if (!grid) return;
    
    if (recipes.length === 0) {
        grid.innerHTML = '<div class="空状态"><i class="fas fa-search"></i><p>未找到相关菜谱</p></div>';
        return;
    }
    
    grid.innerHTML = '';
    recipes.forEach(recipe => {
        const card = createRecipeCard(recipe);
        grid.appendChild(card);
    });
}

// ============================================
// 应用初始化
// ============================================

// 初始化应用
async function initApp() {
    console.log('正在初始化智能菜谱推荐系统...');
    
    try {
        // 1. 初始化主题
        initTheme();
        
        // 2. 加载用户设置
        loadSettings();
        
        // 3. 加载用户数据
        loadUserData();
        
        // 4. 初始化页面导航
        initPageNavigation();
        
        // 5. 初始化事件监听
        initEventListeners();
        
        // 6. 初始化数据
        await initData();
        
        // 7. 更新UI
        updateSettingsUI();
        updateFavoriteCount();
        updateShoppingCartCount();
        
        console.log('应用初始化完成');
        
        // 显示欢迎通知
        setTimeout(() => {
            showNotification('欢迎使用', '智能菜谱推荐系统已准备就绪', 'success', 3000);
        }, 1000);
        
    } catch (error) {
        console.error('应用初始化失败:', error);
        showNotification('初始化失败', '部分功能可能无法使用', 'error');
    }
}

// ============================================
// PWA相关功能
// ============================================

// 检查更新
function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.update();
        });
    }
}

// 显示安装提示
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // 显示安装按钮
    showInstallPrompt();
});

function showInstallPrompt() {
    // 可以在这里添加安装提示UI
    console.log('可以安装为PWA应用');
    
    // 例如：每周最多提示一次
    const lastPrompt = localStorage.getItem('lastInstallPrompt');
    const now = Date.now();
    
    if (!lastPrompt || now - lastPrompt > 7 * 24 * 60 * 60 * 1000) {
        showNotification('添加到桌面', '可以将此应用添加到桌面以获得更好体验', 'info', 8000);
        localStorage.setItem('lastInstallPrompt', now.toString());
    }
}

// 添加到主屏幕
async function addToHomeScreen() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`用户选择: ${outcome}`);
        deferredPrompt = null;
    }
}

// ============================================
// 启动应用
// ============================================

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 监听在线状态
window.addEventListener('online', () => {
    showNotification('网络恢复', '已连接到互联网', 'success');
    checkForUpdates();
});

window.addEventListener('offline', () => {
    showNotification('网络断开', '部分功能可能受限', 'warning');
});

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // 页面重新可见时检查更新
        checkForUpdates();
    }
});

// 导出全局函数
window.调整人数 = 调整人数;
window.选择季节 = 选择季节;
window.切换标签 = 切换标签;
window.生成菜单 = 生成菜单;
window.重新生成 = 重新生成;
window.查看菜谱详情 = 查看菜谱详情;
window.切换收藏 = 切换收藏;
window.清空收藏 = 清空收藏;
window.添加购物车 = 添加购物车;
window.清空购物车 = 清空购物车;
window.打印清单 = 打印清单;
window.导出PDF = 导出PDF;
window.导出图片 = 导出图片;
window.生成购物清单 = 生成购物清单;
window.分享菜单 = 分享菜单;
window.保存收藏 = 保存收藏;
window.显示添加菜谱弹窗 = 显示添加菜谱弹窗;
window.隐藏添加菜谱弹窗 = 隐藏添加菜谱弹窗;
window.显示手动表单 = 显示手动表单;
window.下载模板文件 = 下载模板文件;
window.显示营养详情 = 显示营养详情;
window.隐藏营养详情 = 隐藏营养详情;
window.隐藏菜谱详情 = 隐藏菜谱详情;
window.显示用户中心 = 显示用户中心;
window.隐藏用户中心 = 隐藏用户中心;

console.log('前端脚本已加载');
