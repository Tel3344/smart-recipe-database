// ============================================
// 智能菜谱推荐系统 - 购物清单生成模块
// ============================================

class ShoppingListGenerator {
    constructor() {
        this.config = {
            // 食材分类
            categories: {
                '蔬菜类': ['菜', '笋', '菇', '菌', '椒', '瓜', '茄', '豆', '萝卜', '胡萝卜', '土豆', '红薯', '葱', '姜', '蒜', '香菜', '芹菜', '菠菜', '生菜', '油菜'],
                '水果类': ['果', '桃', '梨', '苹果', '橘子', '橙子', '香蕉', '葡萄', '草莓', '西瓜', '芒果'],
                '肉类': ['肉', '排', '腿', '蹄', '肝', '肚', '肠', '里脊', '五花', '排骨', '鸡', '鸭', '鹅', '牛', '羊', '猪'],
                '水产类': ['鱼', '虾', '蟹', '贝', '蛤', '蛏', '蚝', '参', '鲍鱼', '鱿鱼', '墨鱼', '海带', '紫菜'],
                '蛋奶类': ['蛋', '鸡蛋', '鸭蛋', '鹌鹑蛋', '牛奶', '酸奶', '奶酪', '黄油', '奶油'],
                '豆制品': ['豆腐', '豆干', '豆皮', '腐竹', '豆泡', '豆浆', '黄豆', '绿豆', '红豆'],
                '调味品': ['油', '盐', '酱', '醋', '糖', '料酒', '生抽', '老抽', '蚝油', '香油', '麻油', '辣椒', '花椒', '八角', '桂皮', '香叶'],
                '主食类': ['米', '面', '粉', '饭', '粥', '馒头', '包子', '饺子', '面条', '面包', '饼干', '蛋糕'],
                '干货类': ['木耳', '香菇', '红枣', '枸杞', '桂圆', '莲子', '花生', '核桃', '芝麻'],
                '其他': [] // 默认分类
            },
            
            // 单位转换表
            unitConversions: {
                // 重量单位
                '克': { base: 1, type: 'weight' },
                '千克': { base: 1000, type: 'weight' },
                '公斤': { base: 1000, type: 'weight' },
                '斤': { base: 500, type: 'weight' },
                '两': { base: 50, type: 'weight' },
                
                // 体积单位
                '毫升': { base: 1, type: 'volume' },
                '升': { base: 1000, type: 'volume' },
                '汤匙': { base: 15, type: 'volume' },
                '茶匙': { base: 5, type: 'volume' },
                '杯': { base: 240, type: 'volume' },
                
                // 数量单位
                '个': { base: 1, type: 'count' },
                '只': { base: 1, type: 'count' },
                '片': { base: 1, type: 'count' },
                '块': { base: 1, type: 'count' },
                '根': { base: 1, type: 'count' },
                '瓣': { base: 1, type: 'count' },
                '把': { base: 1, type: 'count' }
            },
            
            // 智能推荐
            smartRecommendations: {
                // 常见搭配
                commonPairings: {
                    '番茄': ['鸡蛋', '白糖'],
                    '鸡蛋': ['番茄', '葱花'],
                    '猪肉': ['生姜', '料酒', '生抽'],
                    '鱼': ['生姜', '葱', '料酒'],
                    '鸡肉': ['生姜', '料酒', '香菇'],
                    '豆腐': ['葱花', '酱油', '香油'],
                    '米饭': ['水'],
                    '面条': ['青菜', '酱油', '香油']
                },
                
                // 常用调味品
                commonSeasonings: ['盐', '糖', '生抽', '老抽', '料酒', '醋', '油', '生姜', '大蒜', '葱']
            },
            
            // 购物提示
            shoppingTips: {
                '蔬菜类': '建议新鲜购买，当天使用',
                '肉类': '可冷冻保存，使用前解冻',
                '水产类': '建议当天购买，保持新鲜',
                '水果类': '按需购买，避免存放过久',
                '调味品': '检查家中存量，按需补充'
            }
        };
        
        this.shoppingList = {
            items: {}, // 按名称存储，合并相同食材
            categories: {}, // 按分类存储
            stats: {
                totalItems: 0,
                totalCategories: 0,
                estimatedCost: 0,
                shoppingTime: 0
            },
            metadata: {
                generatedAt: null,
                menuPeople: 0,
                menuName: '',
                notes: []
            }
        };
        
        this.userPreferences = {
            excludeExisting: true,
            autoCategorize: true,
            addCommonSeasonings: true,
            includeTips: true,
            format: 'detailed' // 'detailed' | 'compact' | 'minimal'
        };
    }
    
    // ============================================
    // 主生成函数
    // ============================================
    
    // 从菜单生成购物清单
    generateFromMenu(menu, people = 6, options = {}) {
        try {
            console.log('开始生成购物清单...');
            
            // 重置购物清单
            this.resetShoppingList();
            
            // 更新选项
            this.updateOptions(options);
            
            // 设置元数据
            this.shoppingList.metadata = {
                generatedAt: new Date().toISOString(),
                menuPeople: people,
                menuName: menu.参数?.季节 ? `${menu.参数.季节}菜单` : '智能推荐菜单',
                notes: menu.提示 || []
            };
            
            // 处理所有菜谱
            const allRecipes = this.extractRecipesFromMenu(menu);
            
            // 合并食材
            this.mergeIngredients(allRecipes, people);
            
            // 智能添加常见调味品
            if (this.userPreferences.addCommonSeasonings) {
                this.addCommonSeasonings(allRecipes);
            }
            
            // 分类整理
            if (this.userPreferences.autoCategorize) {
                this.categorizeItems();
            }
            
            // 计算统计信息
            this.calculateStats();
            
            // 添加购物提示
            if (this.userPreferences.includeTips) {
                this.addShoppingTips();
            }
            
            // 检查家中已有食材（模拟）
            if (this.userPreferences.excludeExisting) {
                this.checkExistingItems();
            }
            
            console.log('购物清单生成完成:', this.shoppingList.stats);
            return this.getFormattedList();
            
        } catch (error) {
            console.error('生成购物清单失败:', error);
            throw new Error(`生成失败: ${error.message}`);
        }
    }
    
    // 从单个菜谱生成购物清单
    generateFromRecipe(recipe, people = 4, options = {}) {
        const mockMenu = {
            菜单: { 单菜: [recipe] },
            参数: { 用餐人数: people }
        };
        
        return this.generateFromMenu(mockMenu, people, options);
    }
    
    // ============================================
    // 核心处理函数
    // ============================================
    
    // 从菜单中提取所有菜谱
    extractRecipesFromMenu(menu) {
        const recipes = [];
        
        if (menu.菜单 && typeof menu.菜单 === 'object') {
            Object.values(menu.菜单).forEach(categoryRecipes => {
                if (Array.isArray(categoryRecipes)) {
                    recipes.push(...categoryRecipes);
                }
            });
        }
        
        return recipes;
    }
    
    // 合并食材（按人数调整分量）
    mergeIngredients(recipes, people) {
        recipes.forEach(recipe => {
            const basePeople = recipe.标准份量?.基准人数 || 4;
            const ratio = people / basePeople;
            
            // 处理主要食材
            if (recipe.标准份量?.食材列表) {
                recipe.标准份量.食材列表.forEach(ingredient => {
                    this.addIngredient(ingredient, ratio, recipe.菜品名称);
                });
            }
            
            // 处理调味料
            if (recipe.标准份量?.调味料) {
                recipe.标准份量.调味料.forEach(seasoning => {
                    this.addIngredient(seasoning, ratio, recipe.菜品名称, true);
                });
            }
        });
    }
    
    // 添加单个食材
    addIngredient(ingredient, ratio = 1, sourceRecipe = '', isSeasoning = false) {
        const name = ingredient.食材名称 || ingredient.名称;
        let amount = ingredient.用量;
        let unit = ingredient.单位 || '';
        
        if (!name || !amount) {
            return;
        }
        
        // 调整用量
        const adjustedAmount = this.adjustAmount(amount, ratio, unit);
        
        // 标准化单位
        const standardized = this.standardizeUnit(adjustedAmount, unit);
        
        // 生成唯一键
        const key = this.generateItemKey(name, standardized.unit);
        
        // 添加或更新食材
        if (this.shoppingList.items[key]) {
            // 合并相同食材
            this.shoppingList.items[key].amount += standardized.amount;
            this.shoppingList.items[key].sources.push(sourceRecipe);
        } else {
            // 新食材
            this.shoppingList.items[key] = {
                name: name,
                amount: standardized.amount,
                unit: standardized.unit,
                originalUnit: unit,
                category: this.categorizeIngredient(name),
                isSeasoning: isSeasoning,
                purchased: false,
                priority: isSeasoning ? 'low' : 'normal',
                notes: ingredient.备注 || '',
                sources: sourceRecipe ? [sourceRecipe] : [],
                alternatives: this.getAlternatives(name)
            };
        }
    }
    
    // 调整用量（根据人数比例）
    adjustAmount(amount, ratio, unit) {
        let numericAmount;
        
        // 解析用量
        if (typeof amount === 'number') {
            numericAmount = amount;
        } else if (typeof amount === 'string') {
            // 处理字符串用量如 "2-3", "适量"
            if (amount === '适量' || amount === '少许') {
                return amount; // 返回原字符串
            }
            
            // 提取数字
            const match = amount.match(/(\d+(\.\d+)?)/);
            numericAmount = match ? parseFloat(match[1]) : 1;
        } else {
            numericAmount = 1;
        }
        
        // 应用比例
        if (typeof numericAmount === 'number' && ratio !== 1) {
            return numericAmount * ratio;
        }
        
        return amount;
    }
    
    // 标准化单位
    standardizeUnit(amount, unit) {
        // 如果是"适量"等特殊单位，保持不变
        if (typeof amount === 'string' && (amount === '适量' || amount === '少许')) {
            return { amount: amount, unit: '' };
        }
        
        // 如果没有单位或单位不在转换表中，保持不变
        if (!unit || !this.config.unitConversions[unit]) {
            return { amount: amount, unit: unit || '' };
        }
        
        const conversion = this.config.unitConversions[unit];
        
        // 如果是数字，尝试转换到更合适的单位
        if (typeof amount === 'number') {
            // 重量单位优化（克 -> 斤/两）
            if (conversion.type === 'weight') {
                const grams = amount * conversion.base;
                
                if (grams >= 500) {
                    // 使用斤
                    return { amount: grams / 500, unit: '斤' };
                } else if (grams >= 50) {
                    // 使用两
                    return { amount: grams / 50, unit: '两' };
                } else {
                    // 使用克
                    return { amount: grams, unit: '克' };
                }
            }
            
            // 体积单位优化（毫升 -> 升）
            if (conversion.type === 'volume') {
                const ml = amount * conversion.base;
                
                if (ml >= 1000) {
                    return { amount: ml / 1000, unit: '升' };
                } else {
                    return { amount: ml, unit: '毫升' };
                }
            }
        }
        
        // 默认返回原单位和数量
        return { amount: amount, unit: unit };
    }
    
    // 生成食材唯一键
    generateItemKey(name, unit) {
        // 简化和标准化名称
        const normalizedName = this.normalizeName(name);
        return `${normalizedName}_${unit}`.toLowerCase();
    }
    
    // 标准化名称
    normalizeName(name) {
        // 移除多余空格和特殊字符
        let normalized = name
            .replace(/\s+/g, '')
            .replace(/[()（）]/g, '')
            .trim();
        
        // 常见别名映射
        const aliases = {
            '蕃茄': '番茄',
            '西红柿': '番茄',
            '马铃薯': '土豆',
            '洋芋': '土豆',
            '地瓜': '红薯',
            '甘薯': '红薯',
            '卷心菜': '包菜',
            '圆白菜': '包菜',
            '青江菜': '青菜',
            '小青菜': '青菜',
            '豇豆': '豆角',
            '菜椒': '青椒'
        };
        
        return aliases[normalizedName] || normalized;
    }
    
    // 分类食材
    categorizeIngredient(name) {
        const normalizedName = this.normalizeName(name);
        
        for (const [category, keywords] of Object.entries(this.config.categories)) {
            for (const keyword of keywords) {
                if (normalizedName.includes(keyword)) {
                    return category;
                }
            }
        }
        
        return '其他';
    }
    
    // 智能添加常见调味品
    addCommonSeasonings(recipes) {
        const usedIngredients = new Set(Object.keys(this.shoppingList.items));
        
        this.config.smartRecommendations.commonSeasonings.forEach(seasoning => {
            // 检查是否已经有这种调味品
            const seasoningKey = this.generateItemKey(seasoning, '适量');
            
            if (!this.shoppingList.items[seasoningKey]) {
                // 添加常见调味品
                this.shoppingList.items[seasoningKey] = {
                    name: seasoning,
                    amount: '适量',
                    unit: '',
                    originalUnit: '',
                    category: '调味品',
                    isSeasoning: true,
                    purchased: false,
                    priority: 'low',
                    notes: '常用调味品，检查家中存量',
                    sources: ['智能推荐'],
                    alternatives: []
                };
            }
        });
        
        // 根据已用食材添加搭配调味品
        Object.values(this.shoppingList.items).forEach(item => {
            if (item.category !== '调味品' && !item.isSeasoning) {
                const pairings = this.config.smartRecommendations.commonPairings[item.name];
                if (pairings) {
                    pairings.forEach(pairing => {
                        const pairingKey = this.generateItemKey(pairing, '适量');
                        
                        if (!this.shoppingList.items[pairingKey]) {
                            this.shoppingList.items[pairingKey] = {
                                name: pairing,
                                amount: '适量',
                                unit: '',
                                originalUnit: '',
                                category: '调味品',
                                isSeasoning: true,
                                purchased: false,
                                priority: 'low',
                                notes: `搭配${item.name}使用`,
                                sources: ['智能搭配'],
                                alternatives: []
                            };
                        }
                    });
                }
            }
        });
    }
    
    // 分类整理
    categorizeItems() {
        this.shoppingList.categories = {};
        
        Object.values(this.shoppingList.items).forEach(item => {
            const category = item.category;
            
            if (!this.shoppingList.categories[category]) {
                this.shoppingList.categories[category] = [];
            }
            
            this.shoppingList.categories[category].push(item);
        });
        
        // 按优先级和名称排序
        Object.keys(this.shoppingList.categories).forEach(category => {
            this.shoppingList.categories[category].sort((a, b) => {
                // 先按优先级
                const priorityOrder = { high: 0, normal: 1, low: 2 };
                const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                
                if (priorityDiff !== 0) return priorityDiff;
                
                // 再按名称
                return a.name.localeCompare(b.name, 'zh-CN');
            });
        });
    }
    
    // 计算统计信息
    calculateStats() {
        const items = Object.values(this.shoppingList.items);
        
        this.shoppingList.stats = {
            totalItems: items.length,
            totalCategories: Object.keys(this.shoppingList.categories).length,
            estimatedCost: this.estimateCost(items),
            shoppingTime: this.estimateShoppingTime(items),
            itemBreakdown: this.getItemBreakdown(items),
            seasoningsCount: items.filter(item => item.isSeasoning).length
        };
    }
    
    // 估算成本
    estimateCost(items) {
        // 简单的成本估算模型（可根据实际数据调整）
        const priceRanges = {
            '蔬菜类': { min: 5, max: 20 },
            '水果类': { min: 10, max: 30 },
            '肉类': { min: 20, max: 50 },
            '水产类': { min: 30, max: 80 },
            '蛋奶类': { min: 10, max: 25 },
            '豆制品': { min: 5, max: 15 },
            '调味品': { min: 5, max: 20 },
            '主食类': { min: 10, max: 30 },
            '干货类': { min: 15, max: 40 },
            '其他': { min: 10, max: 25 }
        };
        
        let total = 0;
        
        items.forEach(item => {
            const range = priceRanges[item.category] || priceRanges['其他'];
            
            // 根据数量和类型调整价格
            let itemPrice = (range.min + range.max) / 2;
            
            if (typeof item.amount === 'number') {
                if (item.unit === '斤' || item.unit === '千克') {
                    itemPrice *= item.amount;
                } else if (item.unit === '克') {
                    itemPrice *= item.amount / 500; // 按斤换算
                } else if (item.unit === '个' || item.unit === '只') {
                    itemPrice *= Math.max(1, item.amount / 2);
                }
            }
            
            total += itemPrice;
        });
        
        return Math.round(total);
    }
    
    // 估算购物时间
    estimateShoppingTime(items) {
        // 基础时间 + 每项物品的时间
        const baseTime = 30; // 分钟
        const perItemTime = 2;
        
        return baseTime + (items.length * perItemTime);
    }
    
    // 获取物品分类统计
    getItemBreakdown(items) {
        const breakdown = {};
        
        items.forEach(item => {
            const category = item.category;
            breakdown[category] = (breakdown[category] || 0) + 1;
        });
        
        return breakdown;
    }
    
    // 添加购物提示
    addShoppingTips() {
        this.shoppingList.tips = [];
        
        // 按类别添加提示
        Object.keys(this.shoppingList.categories).forEach(category => {
            if (this.config.shoppingTips[category]) {
                this.shoppingList.tips.push({
                    category: category,
                    tip: this.config.shoppingTips[category],
                    items: this.shoppingList.categories[category].length
                });
            }
        });
        
        // 添加通用提示
        this.shoppingList.tips.push({
            category: '通用',
            tip: '建议按照分类顺序购买，提高效率',
            items: this.shoppingList.stats.totalItems
        });
        
        if (this.shoppingList.stats.seasoningsCount > 5) {
            this.shoppingList.tips.push({
                category: '调味品',
                tip: '调味品较多，建议检查家中存量',
                items: this.shoppingList.stats.seasoningsCount
            });
        }
        
        // 根据购物时间添加提示
        if (this.shoppingList.stats.shoppingTime > 60) {
            this.shoppingList.tips.push({
                category: '时间',
                tip: '购物项目较多，建议预留充足时间',
                items: this.shoppingList.stats.totalItems
            });
        }
    }
    
    // 检查家中已有食材（模拟）
    checkExistingItems() {
        // 模拟用户已有的常见食材
        const commonExistingItems = [
            '盐', '糖', '油', '大米', '面粉', '鸡蛋', '生姜', '大蒜', '葱'
        ];
        
        Object.values(this.shoppingList.items).forEach(item => {
            if (commonExistingItems.includes(item.name)) {
                item.purchased = true;
                item.notes = (item.notes ? item.notes + '，' : '') + '家中已有';
            }
        });
    }
    
    // 获取替代品
    getAlternatives(name) {
        const alternatives = {
            '春笋': ['冬笋', '茭白', '芦笋'],
            '猪里脊': ['猪梅花肉', '鸡胸肉', '牛肉'],
            '番茄': ['番茄酱', '红椒'],
            '青椒': ['彩椒', '尖椒'],
            '料酒': ['白酒', '黄酒'],
            '生抽': ['酱油', '鱼露'],
            '香油': ['芝麻油', '花生油'],
            '豆腐': ['豆干', '豆泡'],
            '米饭': ['面条', '馒头'],
            '白糖': ['冰糖', '蜂蜜']
        };
        
        return alternatives[name] || [];
    }
    
    // ============================================
    // 输出格式函数
    // ============================================
    
    // 获取格式化列表
    getFormattedList(format = null) {
        const outputFormat = format || this.userPreferences.format;
        
        switch (outputFormat) {
            case 'compact':
                return this.getCompactFormat();
            case 'minimal':
                return this.getMinimalFormat();
            case 'detailed':
            default:
                return this.getDetailedFormat();
        }
    }
    
    // 详细格式
    getDetailedFormat() {
        return {
            metadata: this.shoppingList.metadata,
            categories: this.shoppingList.categories,
            stats: this.shoppingList.stats,
            tips: this.shoppingList.tips,
            generatedBy: '智能菜谱推荐系统',
            version: '1.0.0'
        };
    }
    
    // 紧凑格式
    getCompactFormat() {
        const compactList = [];
        
        Object.entries(this.shoppingList.categories).forEach(([category, items]) => {
            compactList.push(`【${category}】`);
            items.forEach(item => {
                const checkmark = item.purchased ? '✓' : '□';
                const amountStr = typeof item.amount === 'number' 
                    ? `${item.amount}${item.unit}`
                    : item.amount;
                compactList.push(`  ${checkmark} ${item.name}: ${amountStr}`);
            });
            compactList.push('');
        });
        
        return {
            list: compactList.join('\n'),
            stats: {
                总项数: this.shoppingList.stats.totalItems,
                预计花费: `约${this.shoppingList.stats.estimatedCost}元`,
                预计时间: `${this.shoppingList.stats.shoppingTime}分钟`
            },
            timestamp: this.shoppingList.metadata.generatedAt
        };
    }
    
    // 最小格式（纯文本）
    getMinimalFormat() {
        const lines = ['购物清单'];
        
        Object.entries(this.shoppingList.categories).forEach(([category, items]) => {
            lines.push(`${category}:`);
            items.forEach(item => {
                const amountStr = typeof item.amount === 'number' 
                    ? `${item.amount}${item.unit}`
                    : item.amount;
                lines.push(`- ${item.name} ${amountStr}`);
            });
        });
        
        return lines.join('\n');
    }
    
    // 生成HTML格式
    generateHTML() {
        const html = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${this.shoppingList.metadata.menuName} - 购物清单</title>
                <style>
                    body {
                        font-family: 'Noto Sans SC', sans-serif;
                        line-height: 1.6;
                        color: #2C3E50;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #2E8B57;
                    }
                    
                    .header h1 {
                        color: #2E8B57;
                        margin-bottom: 10px;
                    }
                    
                    .metadata {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 10px;
                        margin-bottom: 20px;
                        font-size: 14px;
                        color: #7F8C8D;
                    }
                    
                    .stats {
                        background: #F8FFF8;
                        border-radius: 10px;
                        padding: 15px;
                        margin-bottom: 25px;
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                    }
                    
                    .stat-item {
                        text-align: center;
                    }
                    
                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2E8B57;
                    }
                    
                    .stat-label {
                        font-size: 12px;
                        color: #7F8C8D;
                        margin-top: 5px;
                    }
                    
                    .category {
                        margin-bottom: 25px;
                    }
                    
                    .category-header {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 15px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid #E8F5E9;
                    }
                    
                    .category-title {
                        font-size: 18px;
                        font-weight: bold;
                        color: #2C3E50;
                    }
                    
                    .category-count {
                        background: #2E8B57;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 12px;
                    }
                    
                    .items-list {
                        display: grid;
                        gap: 8px;
                    }
                    
                    .item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px;
                        background: white;
                        border-radius: 8px;
                        border: 1px solid #E8F5E9;
                        transition: all 0.2s;
                    }
                    
                    .item:hover {
                        border-color: #2E8B57;
                        box-shadow: 0 2px 8px rgba(46, 139, 87, 0.1);
                    }
                    
                    .item-checkbox {
                        width: 18px;
                        height: 18px;
                        border-radius: 4px;
                        border: 2px solid #2E8B57;
                        cursor: pointer;
                        flex-shrink: 0;
                    }
                    
                    .item-checkbox.checked {
                        background: #2E8B57;
                        position: relative;
                    }
                    
                    .item-checkbox.checked::after {
                        content: '✓';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 12px;
                    }
                    
                    .item-name {
                        flex: 1;
                        font-weight: 500;
                    }
                    
                    .item-amount {
                        color: #2E8B57;
                        font-weight: bold;
                        min-width: 80px;
                        text-align: right;
                    }
                    
                    .item-notes {
                        font-size: 12px;
                        color: #7F8C8D;
                        margin-top: 2px;
                    }
                    
                    .tips {
                        background: #FFF3CD;
                        border: 1px solid #FFEEBA;
                        border-radius: 10px;
                        padding: 20px;
                        margin-top: 30px;
                    }
                    
                    .tips-title {
                        color: #856404;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .tip-item {
                        margin-bottom: 10px;
                        padding-left: 20px;
                        position: relative;
                    }
                    
                    .tip-item::before {
                        content: '💡';
                        position: absolute;
                        left: 0;
                    }
                    
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #E8F5E9;
                        color: #7F8C8D;
                        font-size: 12px;
                    }
                    
                    @media print {
                        body {
                            padding: 0;
                        }
                        
                        .item-checkbox {
                            border: 1px solid #000;
                        }
                        
                        .item-checkbox.checked {
                            background: #000;
                        }
                    }
                </style>
            </head>
            <body>
                ${this.generateHTMLContent()}
                <script>
                    // 交互功能
                    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
                        checkbox.addEventListener('click', function() {
                            this.classList.toggle('checked');
                            const itemName = this.closest('.item').querySelector('.item-name').textContent;
                            console.log('标记项目:', itemName, this.classList.contains('checked'));
                        });
                    });
                    
                    // 打印功能
                    function printList() {
                        window.print();
                    }
                    
                    // 复制到剪贴板
                    function copyToClipboard() {
                        const text = document.querySelector('body').innerText;
                        navigator.clipboard.writeText(text).then(() => {
                            alert('购物清单已复制到剪贴板');
                        });
                    }
                </script>
            </body>
            </html>
        `;
        
        return html;
    }
    
    // 生成HTML内容
    generateHTMLContent() {
        let html = `
            <div class="header">
                <h1>🛒 ${this.shoppingList.metadata.menuName} - 购物清单</h1>
                <div class="metadata">
                    <div>生成时间: ${new Date(this.shoppingList.metadata.generatedAt).toLocaleString('zh-CN')}</div>
                    <div>用餐人数: ${this.shoppingList.metadata.menuPeople}人</div>
                    <div>总项目数: ${this.shoppingList.stats.totalItems}项</div>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">${this.shoppingList.stats.totalItems}</div>
                    <div class="stat-label">总项数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.shoppingList.stats.totalCategories}</div>
                    <div class="stat-label">分类数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.shoppingList.stats.estimatedCost}元</div>
                    <div class="stat-label">预计花费</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.shoppingList.stats.shoppingTime}分钟</div>
                    <div class="stat-label">预计时间</div>
                </div>
            </div>
        `;
        
        // 按分类显示物品
        Object.entries(this.shoppingList.categories).forEach(([category, items]) => {
            html += `
                <div class="category">
                    <div class="category-header">
                        <div class="category-title">${category}</div>
                        <div class="category-count">${items.length}项</div>
                    </div>
                    <div class="items-list">
            `;
            
            items.forEach(item => {
                const amountStr = typeof item.amount === 'number' 
                    ? `${item.amount}${item.unit}`
                    : item.amount;
                
                const checkedClass = item.purchased ? 'checked' : '';
                const notesHTML = item.notes ? `<div class="item-notes">${item.notes}</div>` : '';
                
                html += `
                    <div class="item">
                        <div class="item-checkbox ${checkedClass}" data-item="${item.name}"></div>
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            ${notesHTML}
                        </div>
                        <div class="item-amount">${amountStr}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        // 购物提示
        if (this.shoppingList.tips && this.shoppingList.tips.length > 0) {
            html += `
                <div class="tips">
                    <div class="tips-title">
                        <i class="fas fa-lightbulb"></i>
                        <span>购物提示</span>
                    </div>
            `;
            
            this.shoppingList.tips.forEach(tip => {
                html += `
                    <div class="tip-item">
                        <strong>${tip.category}:</strong> ${tip.tip} (${tip.items}项)
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        // 操作按钮
        html += `
            <div class="footer">
                <button onclick="printList()" style="margin-right: 10px;">🖨️ 打印清单</button>
                <button onclick="copyToClipboard()">📋 复制文本</button>
                <p style="margin-top: 20px;">
                    由 食刻智能菜谱系统 生成 · ${new Date().getFullYear()}
                </p>
            </div>
        `;
        
        return html;
    }
    
    // ============================================
    // 工具函数
    // ============================================
    
    // 重置购物清单
    resetShoppingList() {
        this.shoppingList = {
            items: {},
            categories: {},
            stats: {
                totalItems: 0,
                totalCategories: 0,
                estimatedCost: 0,
                shoppingTime: 0
            },
            metadata: {
                generatedAt: null,
                menuPeople: 0,
                menuName: '',
                notes: []
            }
        };
    }
    
    // 更新选项
    updateOptions(options) {
        this.userPreferences = {
            ...this.userPreferences,
            ...options
        };
    }
    
    // 导出为JSON
    exportToJSON() {
        return JSON.stringify(this.getDetailedFormat(), null, 2);
    }
    
    // 导入购物清单
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.shoppingList = data;
            return true;
        } catch (error) {
            console.error('导入购物清单失败:', error);
            return false;
        }
    }
    
    // 保存到本地存储
    saveToLocalStorage(key = 'shoppingList') {
        try {
            localStorage.setItem(key, this.exportToJSON());
            return true;
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            return false;
        }
    }
    
    // 从本地存储加载
    loadFromLocalStorage(key = 'shoppingList') {
        try {
            const jsonString = localStorage.getItem(key);
            if (jsonString) {
                return this.importFromJSON(jsonString);
            }
            return false;
        } catch (error) {
            console.error('从本地存储加载失败:', error);
            return false;
        }
    }
    
    // 标记为已购买
    markAsPurchased(itemName, purchased = true) {
        Object.values(this.shoppingList.items).forEach(item => {
            if (item.name === itemName) {
                item.purchased = purchased;
            }
        });
    }
    
    // 获取未购买物品
    getUnpurchasedItems() {
        return Object.values(this.shoppingList.items).filter(item => !item.purchased);
    }
    
    // 获取已购买物品
    getPurchasedItems() {
        return Object.values(this.shoppingList.items).filter(item => item.purchased);
    }
    
    // 清空已购买标记
    clearPurchaseMarks() {
        Object.values(this.shoppingList.items).forEach(item => {
            item.purchased = false;
        });
    }
}

// ============================================
// 导出函数（与现有代码兼容）
// ============================================

// 全局购物清单生成器实例
let shoppingListGenerator = null;

// 初始化购物清单生成器
function initShoppingListGenerator() {
    if (!shoppingListGenerator) {
        shoppingListGenerator = new ShoppingListGenerator();
    }
    return shoppingListGenerator;
}

// 主生成函数（与现有代码兼容）
function 生成购物清单(menuData = null, options = {}) {
    try {
        // 初始化生成器
        const generator = initShoppingListGenerator();
        
        // 如果没有提供菜单数据，使用当前菜单
        let targetMenu = menuData;
        if (!targetMenu && window.currentMenu) {
            targetMenu = window.currentMenu;
        }
        
        if (!targetMenu) {
            throw new Error('没有找到菜单数据，请先生成菜单');
        }
        
        // 获取用餐人数
        const people = targetMenu.参数?.用餐人数 || 6;
        
        // 生成购物清单
        const result = generator.generateFromMenu(targetMenu, people, options);
        
        // 保存到本地存储
        generator.saveToLocalStorage();
        
        // 显示成功通知
        showNotification('购物清单已生成', `共${result.stats.totalItems}项物品`, 'success');
        
        // 返回结果
        return result;
        
    } catch (error) {
        console.error('生成购物清单失败:', error);
        showNotification('生成失败', error.message, 'error');
        throw error;
    }
}

// 显示购物清单
function 显示购物清单() {
    try {
        const generator = initShoppingListGenerator();
        
        // 检查是否有购物清单
        if (Object.keys(generator.shoppingList.items).length === 0) {
            // 尝试从本地存储加载
            if (!generator.loadFromLocalStorage()) {
                showNotification('提示', '请先生成购物清单', 'warning');
                return;
            }
        }
        
        // 生成HTML并显示
        const html = generator.generateHTML();
        
        // 创建新窗口显示
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        
        // 自动打印（可选）
        // setTimeout(() => {
        //     printWindow.print();
        // }, 500);
        
    } catch (error) {
        console.error('显示购物清单失败:', error);
        showNotification('显示失败', error.message, 'error');
    }
}

// 导出为文本
function 导出购物清单文本() {
    try {
        const generator = initShoppingListGenerator();
        
        if (Object.keys(generator.shoppingList.items).length === 0) {
            showNotification('提示', '请先生成购物清单', 'warning');
            return;
        }
        
        const text = generator.getMinimalFormat();
        
        // 创建下载
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `购物清单_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('导出成功', '文本文件已保存', 'success');
        
    } catch (error) {
        console.error('导出文本失败:', error);
        showNotification('导出失败', error.message, 'error');
    }
}

// 显示通知函数（与主应用兼容）
function showNotification(title, message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(title, message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
}

// 导出函数到全局
window.生成购物清单 = 生成购物清单;
window.显示购物清单 = 显示购物清单;
window.导出购物清单文本 = 导出购物清单文本;
window.ShoppingListGenerator = ShoppingListGenerator;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化
    setTimeout(() => {
        try {
            initShoppingListGenerator();
            console.log('购物清单生成模块已初始化');
        } catch (error) {
            console.warn('购物清单生成模块初始化失败:', error);
        }
    }, 1000);
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ShoppingListGenerator,
        生成购物清单,
        显示购物清单,
        导出购物清单文本
    };
}
